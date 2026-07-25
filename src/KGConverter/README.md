# KGConverter

KGConverter converts Japanese text and PDF documents into document-level RDF-star knowledge graphs. It uses the OpenAI API to:

1. extract causal triples, opinions, and stakeholders;
2. generalize subjects, objects, and stakeholder classes; and
3. convert the resulting JSON into TriG files with named graph IRIs.

This is the conversion program used to construct the RDF data released in the REFV-KG repository.

## Requirements

- Java 25, as specified in `pom.xml`
- Apache Maven
- An OpenAI API key
- Network access to the OpenAI API

The program was primarily developed and tested on Windows. Input documents are sent to the OpenAI API for processing.

## Supported input

Place the source files directly under an input directory. Files in nested directories are not processed.

- Plain-text files detected as `text/*`
- PDF files detected as PDF

Other file types are skipped.

## Configuration

Two YAML files are used.

### `settings/setting.yaml`

This file controls graph IRIs and output files.

```yaml
graph:
  prefix: "https://kozaki-lab.jp/REFV-KG/docs/"
  offset: "00000"
  prompt: "settings/prompt_setting.yaml"
file:
  path: "./output/"
  json: "./output/json/"
  relation: "relation.tsv"
  output: "Graph_{}.trig"
  id: "id_relation.json"
```

| Setting | Description |
|---|---|
| `graph.prefix` | Prefix of each document's named graph IRI |
| `graph.offset` | Initial identifier and zero-padding format |
| `graph.prompt` | Path to the prompt configuration |
| `file.path` | Output directory for TriG and relation files |
| `file.json` | Output directory for intermediate JSON |
| `file.relation` | TSV file mapping inputs, graph IRIs, and outputs |
| `file.output` | Output filename template; `{}` is replaced by the generated identifier |
| `file.id` | JSON file used to maintain shared class identifiers across documents |

### `settings/prompt_setting.yaml`

This file specifies the OpenAI model and the prompts for extraction and generalization.

```yaml
model:
  name: "gpt-5.4"
  key: "YOUR_OPENAI_API_KEY"
```

Do not commit a real API key. Create a local prompt-setting file, keep it outside version control, and point `graph.prompt` to that file.

The `conversion` prompt extracts cause, effect, and countermeasure triples together with opinions, stakeholders, and supporting text. The `generalization` prompt assigns generalized classes to subjects, objects, and stakeholders.

## Build

From the `KGConverter` directory:

```shell
mvn clean package
```

The main class is:

```text
jp.ac.osakac.kgconverter.KGProcessor
```

## Run

The program accepts an input directory and an optional overall setting file:

```text
KGProcessor <input-directory> [setting-file]
```

When the setting file is omitted, `./settings/setting.yaml` is used.

Example using Maven:

```shell
mvn exec:java "-Dexec.mainClass=jp.ac.osakac.kgconverter.KGProcessor" "-Dexec.args=./input ./settings/setting.yaml"
```

Run the command from the `KGConverter` directory so that the default relative paths resolve correctly.

## Outputs

| Output | Description |
|---|---|
| `*.trig` | RDF-star data for one source document, stored in its assigned named graph |
| `*.trig.json` | Intermediate JSON containing extracted and generalized data |
| `relation.tsv` | Mapping among the input filename, graph IRI, TriG file, and JSON file |
| `id_relation.json` | Lists used to assign consistent class IDs across documents |
| Log output | Processing information controlled by `src/main/resources/logback.xml` |

The relation TSV contains:

```text
input_file    graph    output_file    json_file
```

The ID-relation JSON contains:

- `cls_list`: generalized subject and object class labels;
- `st_cls_list`: generalized stakeholder class labels.

Reuse the same `id_relation.json` when processing additional documents if class labels should retain the same class IDs across runs.

## Processing notes

- API parameters such as temperature and seed are not explicitly set and therefore use the OpenAI API defaults.
- LLM output may vary between runs.
- Files are processed individually and assigned document-level named graphs.
- Intermediate JSON is useful for checking extraction and generalization results before RDF conversion.
- The generated RDF should be validated before publication or loading into a production triple store.

## Related resources

- Prompts used in the study: [`../../prompts/`](../../prompts/)
- Released RDF and manifests: [`../../data/`](../../data/)
- Analysis queries: [`../../queries/`](../../queries/)

---

## 日本語概要

KGConverterは、日本語のテキストまたはPDFから、原因・影響・対策のトリプル、意見、ステークホルダーを抽出し、主語・目的語・ステークホルダーを一般化した後、文書単位の名前付きグラフを持つTriGへ変換するプログラムです。

実行にはJava 25、Maven、OpenAI APIキーが必要です。入力文書はOpenAI APIへ送信されます。実際のAPIキーをGitで管理される設定ファイルへ記述しないでください。

基本的な実行形式は次のとおりです。

```text
KGProcessor <入力フォルダ> [全体設定ファイル]
```

出力として、文書別TriG、中間JSON、入力文書とRDFの対応TSV、クラスID対応JSON、およびログが生成されます。同じ`id_relation.json`を使用することで、複数の処理実行間で一般化クラスのIDを共有できます。
