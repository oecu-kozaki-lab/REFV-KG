package jp.ac.osakac.kgconverter.template;

import java.io.IOException;

/**
 * YAMLのテンプレートを読み込む
 */
public class YamlSettingReader extends YamlTemplateReader {
	
	public YamlSettingReader(String yamlPath) throws IOException {
		super(yamlPath, Output.class);
	}
	
	public Output getData() {
		return (Output)this.getTemplate();
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
