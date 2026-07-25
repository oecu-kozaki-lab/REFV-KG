package jp.ac.osakac.kgconverter;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Arrays;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.openai.models.chat.completions.ChatCompletion;
import com.openai.models.chat.completions.ChatCompletionContentPart;
import com.openai.models.chat.completions.ChatCompletionContentPartText;
import com.openai.models.chat.completions.ChatCompletionCreateParams;
import com.openai.models.files.FileCreateParams;
import com.openai.models.files.FileObject;
import com.openai.models.files.FilePurpose;

import jp.ac.osakac.kgconverter.template.Prompt;
import jp.ac.osakac.kgconverter.template.PromptSetting;

public class KGConstructorPDF extends KGConstructor {
	private static final Logger log = LoggerFactory.getLogger(KGConstructorPDF.class);

	public KGConstructorPDF(PromptSetting setting, Path pdf) throws IOException {
		super(setting, pdf);
		log.trace("constructor in");
	}

	
	@Override
	protected String parseToJson(String model, Prompt prompt) throws IOException {
		log.trace("parseToJson in model:{}", model);
		/**
		 * RDF変換，および，標準化を順に行う
		 */
		
        Path pdfPath = this.context.getSource();

        FileObject logoFileObject = this.client.files()
                .create(FileCreateParams.builder()
                        .file(pdfPath)
                        .purpose(FilePurpose.USER_DATA)
                        .build());

        ChatCompletionContentPart.File logoFile = ChatCompletionContentPart.File.builder()
                .file(ChatCompletionContentPart.File.FileObject.builder()
                        .fileId(logoFileObject.id())
                        .build())
                .build();
        ChatCompletionContentPart logoContentPart = ChatCompletionContentPart.ofFile(logoFile);

        ChatCompletionContentPart questionContentPart =
                ChatCompletionContentPart.ofText(ChatCompletionContentPartText.builder()
                        .text(prompt.getUser().replace("{text}", ""))
                        .build());
        ChatCompletionCreateParams createParams = ChatCompletionCreateParams.builder()
                .model(model)
//                .maxCompletionTokens(2048)
                .addSystemMessage(prompt.getSystem())
                .addUserMessageOfArrayOfContentParts(Arrays.asList(questionContentPart, logoContentPart))
                .build();

        StringBuilder messages = new StringBuilder();
        for (ChatCompletion.Choice choice : this.client.chat().completions().create(createParams).choices()) {
			messages.append(choice.message().content().orElse(""));
		}
        
        /**
        client.chat().completions().create(createParams).choices().stream()
                .flatMap(choice -> choice.message().content().stream())
                .forEach(System.out::println);
                */
		
		
		return messages.toString();
	}


	

}
