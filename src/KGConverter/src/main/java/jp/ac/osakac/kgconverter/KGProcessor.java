package jp.ac.osakac.kgconverter;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.tika.utils.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jp.ac.osakac.kgconverter.template.FileData;
import jp.ac.osakac.kgconverter.template.GraphData;
import jp.ac.osakac.kgconverter.template.Output;
import jp.ac.osakac.kgconverter.template.PromptSetting;
import jp.ac.osakac.kgconverter.template.YamlPromptTemplateReader;
import jp.ac.osakac.kgconverter.template.YamlSettingReader;

public class KGProcessor {
	private static final Logger log = LoggerFactory.getLogger(KGProcessor.class);
	private static final String DEFAULT_SETTING = "./settings/setting.yaml";
	private static final String DEFAULT_PROMPT_SETTING = "./settings/prompt_setting.yaml";
	private static final String DEFAULT_OUTPUT_PATH = "./output/";
	private static final String DEFAULT_OUTPUT_TSV = "relation.tsv";
	private static final String DEFAULT_OUTPUT_FILE = "output_{}.trig";

	private Path path;
	private Output setting;
	
	public KGProcessor(String path) throws Exception {
		this(path, DEFAULT_SETTING);
	}

	
	public KGProcessor(String path, String settingPath) throws Exception {
		log.trace("constructor in path:{}, settingPath:{}", path, settingPath);
		this.path = Paths.get(path);

		PromptSetting promptSetting = null;
		YamlSettingReader settingReader = new YamlSettingReader(settingPath);
		this.setting = settingReader.getData();
		if (this.setting == null) {
			log.error("setting data '{}' not found!!", settingPath);
			throw new Exception("setting data '" + settingPath + "' not found.");
		}
		GraphData graphData = this.setting.getGraph();
		if (graphData == null) {
			log.error("graph setting not found!!");
			throw new Exception("graph setting not found!!");
		}
		FileData fileData = this.setting.getFile();
		if (fileData == null) {
			log.error("file setting not found!!");
			throw new Exception("file setting not found!!");
		}

		String prompt = DEFAULT_PROMPT_SETTING;
		if (graphData.getPrompt() == null) {
			log.warn("prompt setting not found. use default. [{}]",DEFAULT_PROMPT_SETTING);
		}else {
			prompt = graphData.getPrompt();
		}
		YamlPromptTemplateReader reader = new YamlPromptTemplateReader(prompt);
		promptSetting = reader.getData();
		KGConstructorFactory.setting(promptSetting);
	}
	
	public void process() throws IOException {
		log.trace("process in");

		GraphData graphData = this.setting.getGraph();
		FileData fileData = this.setting.getFile();
		
		String outPath_ = fileData.getPath();
		String tsv = fileData.getRelation();
		String outFile_ = fileData.getOutput();
		String jsonPath = fileData.getJson();
		if (outPath_ == null) {
			outPath_ = DEFAULT_OUTPUT_PATH;
			log.warn("output path setting not found. use default. [{}]",DEFAULT_OUTPUT_PATH);
		}
		if (tsv == null) {
			tsv = DEFAULT_OUTPUT_TSV;
			log.warn("output relation_tsv setting not found. use default. [{}]",DEFAULT_OUTPUT_TSV);
		}
		if (outFile_ == null) {
			outFile_ = DEFAULT_OUTPUT_FILE;
			log.warn("output file_name setting not found. use default. [{}]",DEFAULT_OUTPUT_FILE);
		}
		if (jsonPath == null) {
			log.info("output json setting not exist. ");
		}
		
		final String outPath = outPath_;
		final String outFile = outFile_;
		
		
		KGConverter converter = new KGConverter();
		AtomicInteger index = new AtomicInteger();
		index.set(0);
		final String prefix = graphData.getPrefix();
		final String offsetData = graphData.getOffset();
		
		log.info("offset data:{}", offsetData);
		
		Pattern pattern = Pattern.compile("^(.*?)(\\d+)$");
        Matcher matcher = pattern.matcher(offsetData);
        String numPrefix_ = null;//offsetData;
        int digitCount_ = -1;

        if (!matcher.matches()) {
        	//
        } else {
        	numPrefix_ = matcher.group(1);
	        String numberStr = matcher.group(2);
	        digitCount_ = numberStr.length();
	        index.set(Integer.parseInt(numberStr));
        }

        //forEach内で利用する変数はfinalである必要がある
        final String numPrefix = numPrefix_ == null ? offsetData : numPrefix_;
        final int digitCount = digitCount_ < 0 ? 0 : digitCount_;
		log.info("numPrefix :{}, digit count:{}, index:{}", numPrefix, digitCount, index.get());
		
//System.out.println("numPrefix :" + numPrefix + ", digit count:" + digitCount + ", index:"+index.get());
		
		Metadata metadata = new Metadata(Paths.get(outPath, tsv));
		
		Files.list(this.path).forEach(filePath ->{
//System.out.println("file:"+filePath);
			try {
				int i = index.addAndGet(1);
				KGConstructor constructor = KGConstructorFactory.getInstance(filePath);
				if (constructor == null) {
					return;
				}
				String name = StringUtils.leftPad(String.valueOf(i), digitCount, '0');
				String graph = prefix + numPrefix + name;
				String outFileName = outFile.replace("{}", name);
				String json = constructor.doParse();
				log.info("json:{}", json);
				if (jsonPath != null) {
					outputFile(Paths.get(jsonPath, outFileName+".json"), json);
				}
				
				log.info("graph:{}", graph);
//System.out.println("graph:"+graph);
				String id_path = this.setting.getFile().getId();
				log.info("tmp_id_path:{}", id_path);
				String rdf = converter.convert(graph, json, id_path == null ? null : Paths.get(id_path));
//System.out.println("rdf:"+rdf);
				outputFile(Paths.get(outPath, outFileName), rdf);
				metadata.append(filePath.getFileName().toString(), graph, outFileName, Paths.get(jsonPath, outFileName+".json").toString());
			} catch (Exception e) {
				log.error(e.getMessage());
				e.printStackTrace();
			}

		});
		try {
			metadata.close();
		} catch (IOException e) {
			log.error("metadata {} close error.", metadata.name);
			e.printStackTrace();
		}
	}
	
	private void outputFile(Path path, String rdf) throws IOException {
		Files.createDirectories(path.getParent());
		BufferedWriter fw = Files.newBufferedWriter(path, StandardCharsets.UTF_8,StandardOpenOption.CREATE);
		fw.write(rdf);
		fw.close();
	}
		
	public static void main(String[] args) {
		KGProcessor processor;
		
		if (args.length < 1 || 2 < args.length) {
			error();
			System.exit(-1);
		}
		
		try {
			if (args.length == 1) {
				processor = new KGProcessor(args[0]);
			} else {
				processor = new KGProcessor(args[0], args[1]);
			}
			processor.process();
		} catch (Exception e) {
			// TODO 自動生成された catch ブロック
			e.printStackTrace();
		}
	}
	
	private static void error() {
		System.out.println("> java -jar KGConverter.jar フォルダパス {設定ファイルパス}");
		System.out.println("\tフォルダパス\t\t変換対象自然言語テキスト（TEXT/PDF）の格納パス");
		System.out.println("\t設定ファイルパス\t設定ファイルパス（デフォルト：settings/setting.yaml）");
	}
	
	
	
}

/**
 * メタデータ書き出し用
 */
class Metadata {
	private static final Logger log = LoggerFactory.getLogger(Metadata.class);

	private BufferedWriter writer;
	public String name; 
	
	
	public Metadata(Path path) throws IOException {
		log.trace("constructor in path:{}",path);
		Files.createDirectories(path.getParent());
		this.writer = Files.newBufferedWriter(path, StandardCharsets.UTF_8,StandardOpenOption.CREATE);
		this.name = path.toString();
		append("input_file","graph","output_file","json_file");
	}
	
	public void append(String src, String graph, String dest, String json) throws IOException {
		log.trace("append in src:{} graph:{} dest:{} json:{}", src, graph, dest,json);
		Path srcFile = Paths.get(src);
		if (json == null) {
			json = "";
		}
		
		this.writer.append(srcFile.getFileName().toString() + "\t" + graph + "\t" + dest + "\t" + json);
		this.writer.newLine();		
	}
	
	public void close() throws IOException {
		log.trace("close in ");
		this.writer.close();
	}
	
}

