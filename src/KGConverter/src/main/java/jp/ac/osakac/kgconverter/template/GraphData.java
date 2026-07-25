package jp.ac.osakac.kgconverter.template;

public class GraphData {
	/** グラフ名PREFIX */
	private String prefix;
	/** グラフ名テンプレート・オフセット設定テンプレート */
	private String offset;
	/** LLMプロンプト設定ファイルパス */
	private String prompt;
	/**
	 * @return prefix
	 */
	public String getPrefix() {
		return prefix;
	}
	/**
	 * @param prefix セットする prefix
	 */
	public void setPrefix(String prefix) {
		this.prefix = prefix;
	}
	/**
	 * @return offset
	 */
	public String getOffset() {
		return offset;
	}
	/**
	 * @param offset セットする offset
	 */
	public void setOffset(String offset) {
		this.offset = offset;
	}
	/**
	 * @return prompt
	 */
	public String getPrompt() {
		return prompt;
	}
	/**
	 * @param prompt セットする prompt
	 */
	public void setPrompt(String prompt) {
		this.prompt = prompt;
	}
}
