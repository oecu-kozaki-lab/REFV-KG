package jp.ac.osakac.kgconverter;

import java.nio.file.Path;

public class ContentContext {
	/** ファイルパス */
	private Path source;
	
	/** アップロードファイルID */
	private String fileId;
	
	/** 変換結果1（JSON） */
	private String json;
	
	/** 変換結果2（JSON） */
	private String json2;

	public ContentContext(Path source) {
		this.source = source;
	}
	
	/**
	 * @return source
	 */
	public Path getSource() {
		return source;
	}

	/**
	 * @param source セットする source
	 */
	public void setSource(Path source) {
		this.source = source;
	}

	/**
	 * @return fileId
	 */
	public String getFileId() {
		return fileId;
	}

	/**
	 * @param fileId セットする fileId
	 */
	public void setFileId(String fileId) {
		this.fileId = fileId;
	}

	/**
	 * @return json
	 */
	public String getJson() {
		return json;
	}

	/**
	 * @param json セットする json
	 */
	public void setJson(String json) {
		this.json = json;
	}

	/**
	 * @return json2
	 */
	public String getJson2() {
		return json2;
	}

	/**
	 * @param json2 セットする json2
	 */
	public void setJson2(String json2) {
		this.json2 = json2;
	}




	
	
}
