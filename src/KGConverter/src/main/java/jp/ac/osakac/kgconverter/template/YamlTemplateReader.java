package jp.ac.osakac.kgconverter.template;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Paths;

import org.yaml.snakeyaml.Yaml;

/**
 * YAMLのテンプレートを読み込む
 */
public class YamlTemplateReader {
	
	private YamlTemplate data;
	
	public YamlTemplateReader(String yamlPath, Class<? extends YamlTemplate> cls) throws IOException {
		Yaml yaml = new Yaml();
		
		try (InputStream in = Files.newInputStream(Paths.get(yamlPath))){
			this.data = yaml.loadAs(in, cls);
		}
	}
	
	protected YamlTemplate getTemplate() {
		return this.data;
	}
	
}