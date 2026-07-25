package jp.ac.osakac.kgconverter.template;

import java.util.Map;

public class PromptSetting implements YamlTemplate {
	
	/** モデル情報 */
	private Model model;

	/** プロンプトパイプライン */
	private Map<String, Prompt> prompt;


	public PromptSetting() {}
	
	public Model getModel() {
		return model;
	}

	public void setModel(Model model) {
		this.model = model;
	}

	/**
	 * @return prompt
	 */
	public Map<String, Prompt> getPrompt() {
		return prompt;
	}

	/**
	 * @param prompt セットする prompt
	 */
	public void setPrompt(Map<String, Prompt> prompt) {
		this.prompt = prompt;
	}

	

}
