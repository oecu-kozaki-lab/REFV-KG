package jp.ac.osakac.kgconverter;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.chat.completions.ChatCompletion;
import com.openai.models.chat.completions.ChatCompletionCreateParams;

import jp.ac.osakac.kgconverter.json.KGData;
import jp.ac.osakac.kgconverter.template.Prompt;
import jp.ac.osakac.kgconverter.template.PromptSetting;

public abstract class KGConstructor {
	private static final Logger log = LoggerFactory.getLogger(KGConstructor.class);
	
	protected ContentContext context;
	protected OpenAIClient client;
	
	protected PromptSetting setting;
	
	protected KGConstructor(PromptSetting setting, Path path) throws IOException{
		log.trace("constructor in");
		log.info("path:{}",path);
		this.setContext(new ContentContext(path));
		
		this.setting = setting;
		
		if (this.setting.getModel().getKey() == null) {
			log.error("API KEY not set in setting file. ");
			throw new IOException("API KEY not set in setting file. ");
		} else {
			this.client = OpenAIOkHttpClient.builder().apiKey(this.setting.getModel().getKey()).build();
			
		}
		
	}
	
	/**
	 * 自然言語をLLMにて処理し，JSON形式のデータに変換する
	 * @return
	 * @throws IOException
	 */
	public String doParse() throws Exception {
		log.trace("doParse in");
		
		if (this.client == null) {
			log.error("Open API client not intialized.");
			return null;
		}
		
		String model = this.setting.getModel().getName();
		Prompt prompt = this.setting.getPrompt().get("conversion");
		String conversedJson = parseToJson(model, prompt);
		ObjectMapper mapper = new ObjectMapper();
		log.info("conversed json :{}.", conversedJson);
		conversedJson = extractResult(conversedJson);
//		List<KGData> objs = Arrays.asList(mapper.readValue(conversedJson, KGData[].class));
		List<KGData> objs = parseJson(conversedJson);

		String generalize = doGeneralize(model, conversedJson);
		generalize = extractResult(generalize);
		log.info("generalized result :{}.", generalize);

		// 一般化データ以外が格納されているKGDataと一般化データのみが格納されているKGDataをMergeする． 		
//		List<KGData> generalObjs = Arrays.asList(mapper.readValue(generalize, KGData[].class));
		List<KGData> generalObjs = parseJson(generalize);
		
		objs = mergeKGData(objs, generalObjs);
		
		String json = mapper.writeValueAsString(objs);
		
		return json;
		
	}
	
	private List<KGData> mergeKGData(List<KGData> data1, List<KGData> data2) {
		log.trace("mergeKGData in");
		
		// 一般化データのほうがサイズが大きい場合は何もしない（仮処理）
		// ※一般化データのほうが小さい場合，データ欠けとみなして欠けていないところまで処理する
		if (data1.size() < data2.size()) {
			log.warn("wrong size [{} : {}]", data1.size(), data2.size());

			return data1;
		}
		
		for (int i=0; i<data2.size(); i++) {
			KGData d1 = data1.get(i);
			KGData d2 = data2.get(i);
			
			d1.setIppan_s(d2.getIppan_s());
			d1.setIppan_o(d2.getIppan_o());

			if (d1.getOpinion().size() >= d2.getOpinion().size()) {
				for (int j=0; j<d2.getOpinion().size(); j++) {
					d1.getOpinion().get(j).setIppan_st(d2.getOpinion().get(j).getIppan_st());
				}
			} else {
				log.warn("index {} opinion data size mismatch {} : {}", i,d1.getOpinion().size() ,d2.getOpinion().size()  );
			}
			
		}
		return data1;		
	}
	
	
	public void setClient(OpenAIClient client) {
		this.client  = client;
	}
	
	protected void setContext(ContentContext context) {
		this.context = context;
	}
	
	protected abstract String parseToJson(String model, Prompt prompt) throws IOException;

	private String extractResult(String result) {
		log.trace("extractResult in");
		StringBuilder sb = new StringBuilder();
		String[] results = result.split("\n");
		boolean isJson = false;
		
		for (String res : results) {
			if (res.startsWith("```")) {
				if (isJson) {
					break;
				} else {
					isJson = true;
					continue;
				}
			}
			if (isJson) {
				sb.append(res);
				sb.append("\n");
			}
		}
		
		if (sb.length() != 0) {
			return sb.toString();
		}
		return result;
		
	}
	
	
	public String doGeneralize(String model, String json) throws Exception{
		log.trace("doGeneralize in");
		Prompt prompt = this.setting.getPrompt().get("generalization");
		ChatCompletionCreateParams.Builder createParamsBuilder = ChatCompletionCreateParams.builder()
				.model(model)
//				.maxCompletionTokens(2048)
				.addSystemMessage(prompt.getSystem())
				.addUserMessage(prompt.getUser().replace("{json}", json));
		
        StringBuilder messages = new StringBuilder();

		for (ChatCompletion.Choice choice : this.client.chat().completions().create(createParamsBuilder.build()).choices()) {
			messages.append(choice.message().content().orElse(""));
		}
		
		return messages.toString();		
	}
	
	
	private List<KGData> parseJson(String json)  throws IOException {
		ObjectMapper mapper = new ObjectMapper();
		List<KGData> result = new ArrayList<KGData>();
		
		JsonParser parser = mapper.getFactory().createParser(json);

        try {
            if (parser.nextToken() != JsonToken.START_ARRAY) {
                throw new IllegalArgumentException(
                        "JSON root must be an array");
            }

            while (parser.nextToken() != JsonToken.END_ARRAY) {

                try {
                    KGData item = mapper.readValue(parser, KGData.class);
                    result.add(item);
                }
                catch (Exception e) {
                    // 現在の要素が途中で切れている
                	log.error("json is incomplete. {}",e.getMessage());
                	e.printStackTrace();
                    break;
                }
            }
        }
        finally {
            parser.close();
        }

        return result;
		
	}
	
	public static void main(String[] args) {
		try {
			KGConstructor test = KGConstructorFactory.getInstance("D:\\works\\osakac\\202606\\test.pdf");
			if (test != null) {
				System.out.println(test.doParse());
			} else {
				System.out.println("not found.");
			}
		} catch (Exception e) {
			// TODO 自動生成された catch ブロック
			e.printStackTrace();
		}

//		KGConstructorPDF test = new KGConstructorPDF(new File("D:\\works\\osakac\\202606\\test.pdf").toPath());
//		System.out.println(test.parseToJson());
		
	}

}
