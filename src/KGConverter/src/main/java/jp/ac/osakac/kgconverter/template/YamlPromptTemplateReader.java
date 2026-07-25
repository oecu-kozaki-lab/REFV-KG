package jp.ac.osakac.kgconverter.template;

import java.io.IOException;

/**
 * YAMLのテンプレートを読み込む
 */
public class YamlPromptTemplateReader extends YamlTemplateReader {
	
	public YamlPromptTemplateReader(String yamlPath) throws IOException {
		super(yamlPath, PromptSetting.class);
	}
	
	public PromptSetting getData() {
		return (PromptSetting)this.getTemplate();
	}
	
	/*
	public static void main(String[] args) {
		YamlPromptTemplateReader test;
		try {
			test = new YamlPromptTemplateReader("./settings/prompt_setting.yaml");
			System.out.println(test.getData().getModel().getName());
		} catch (IOException e) {
			// TODO 自動生成された catch ブロック
			e.printStackTrace();
		}
	}
	*/
}
