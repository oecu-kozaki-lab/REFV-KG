package jp.ac.osakac.kgconverter.template;

public class FileData {
	/** ファイル名→グラフ 関連付けファイル */
	private String relation;
	/** 出力ファイル名テンプレート */
	private String output;
	/** 出力パス */
	private String path;
	/** 自然言語から変換したJSONファイル */
	private String json;
	/** リソースラベル-ID関連付け用のテンポラリファイル */
	private String id;
	/**
	 * @return relation
	 */
	public String getRelation() {
		return relation;
	}
	/**
	 * @param relation セットする relation
	 */
	public void setRelation(String relation) {
		this.relation = relation;
	}
	/**
	 * @return output
	 */
	public String getOutput() {
		return output;
	}
	/**
	 * @param output セットする output
	 */
	public void setOutput(String output) {
		this.output = output;
	}
	/**
	 * @return path
	 */
	public String getPath() {
		return path;
	}
	/**
	 * @param path セットする path
	 */
	public void setPath(String path) {
		this.path = path;
	}
	public String getJson() {
		return json;
	}
	public void setJson(String json) {
		this.json = json;
	}
	public String getId() {
		return id;
	}
	public void setId(String id) {
		this.id = id;
	}
}
