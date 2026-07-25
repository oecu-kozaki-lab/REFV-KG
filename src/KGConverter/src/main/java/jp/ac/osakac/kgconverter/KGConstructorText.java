package jp.ac.osakac.kgconverter;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.openai.models.chat.completions.ChatCompletion;
import com.openai.models.chat.completions.ChatCompletionCreateParams;

import jp.ac.osakac.kgconverter.template.Prompt;
import jp.ac.osakac.kgconverter.template.PromptSetting;
import jp.ac.osakac.kgconverter.template.YamlPromptTemplateReader;

public class KGConstructorText extends KGConstructor {
	private static final Logger log = LoggerFactory.getLogger(KGConstructorText.class);

	public KGConstructorText(PromptSetting setting, Path file) throws IOException {
		super(setting, file);
		log.trace("constructor in");
	}

	@Override
	protected String parseToJson(String model, Prompt prompt) throws IOException {
		log.trace("parseToJson in model:{}", model);

		ChatCompletionCreateParams.Builder createParamsBuilder = ChatCompletionCreateParams.builder()
				.model(model)
//              .maxCompletionTokens(2048)
				.addSystemMessage(prompt.getSystem())
				.addUserMessage(prompt.getUser().replace("{text}", readText()));
		
        StringBuilder messages = new StringBuilder();

		for (ChatCompletion.Choice choice : this.client.chat().completions().create(createParamsBuilder.build()).choices()) {
			messages.append(choice.message().content().orElse(""));
		}
		
		
		return messages.toString();

	}
	
	private String readText() throws IOException {
		log.trace("readText in");
		List<String> contents = Files.readAllLines(context.getSource());

		StringBuilder sb = new StringBuilder();
		
		contents.forEach(content -> sb.append(content));
		
		return sb.toString();
	}

	
	public static void main(String[] args) {
		try {
			YamlPromptTemplateReader reader = new YamlPromptTemplateReader("./settings/prompt_setting.yaml");
			PromptSetting promptSetting = reader.getData();
			KGConstructorText test = new KGConstructorText(promptSetting, Paths.get("D:\\works\\osakac\\202606\\test.txt"));
//			KGConstructorText test = new KGConstructorText(promptSetting, Paths.get("D:\\works\\osakac\\202606\\test\\0622\\input\\鶴岡市  令和　　５年　　９月　定例会  09月11日－04号.txt"));
			System.out.println(test.doParse());
		} catch (Exception e) {
			// TODO 自動生成された catch ブロック
			e.printStackTrace();
		}
		
	}

}
