package jp.ac.osakac.kgconverter;

import java.io.File;
import java.io.IOException;
import java.nio.file.NoSuchFileException;

/**
 * テキストの発言を抽出する
 */
public class CommentExtractor {

	public CommentExtractor(String path) throws IOException {
		this(new File(path), new File("./prompts/extraction_v1.yaml"));
	}

	
	public CommentExtractor(String path, String yamlPath) throws IOException {
		this(new File(path), new File(yamlPath));
	}

	public CommentExtractor(File file, File yamlPath) throws IOException {
		if (!file.canRead()) {
			throw new NoSuchFileException(file.getAbsolutePath());
		}
		
	}
	
	public static void main(String[] args) {
		System.out.println(new File("./").getAbsolutePath());
	}
	

}
