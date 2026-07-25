package jp.ac.osakac.kgconverter;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;

import javax.annotation.processing.FilerException;

import org.apache.tika.Tika;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jp.ac.osakac.kgconverter.template.PromptSetting;

public class KGConstructorFactory {
	private static final Logger log = LoggerFactory.getLogger(KGConstructorFactory.class);
	
	private static PromptSetting setting_;

	public static void setting(PromptSetting setting) {
		setting_ = setting;
	}
	
	public static KGConstructor getInstance(String path) throws IOException {
		return getInstance(new File(path));
	}

	public static KGConstructor getInstance(Path path) throws IOException {
		return getInstance(path.toFile());
	}

	public static KGConstructor getInstance(File file) throws IOException {
		log.trace("getInstance in");
		log.info("file path : {}", file);
		if (!file.exists() || !file.canRead() || file.isDirectory()) {
			throw new FilerException(file.getAbsolutePath());
		}
		
		Tika tika = new Tika(); // File種別判定用ライブラリ
		String fileType = tika.detect(file);
		
		// TODO
		// 現状，fileTypeが「text」から始まる場合にtext，「pdf」が含まれる場合にPDFとしている．
		// それ以外の場合は対象外となる．
		
		
		if (fileType.startsWith("text")) {
			log.info("type KGConstructorText -> {}",fileType);
			// text
			return new KGConstructorText(setting_, file.toPath());
		}
		
		
		if (fileType.contains("pdf")) {
			log.info("type KGConstructorText -> {}",fileType);
			// PDF
			return new KGConstructorPDF(setting_, file.toPath());
		}
		
		log.info("no type matched -> {}",fileType);
		return null;
		
	}


	
	
}
