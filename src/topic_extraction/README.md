# Topic Extraction

These scripts extract wind-power-related spans from Japanese parliamentary records using the OpenAI Batch API. They were used for the production preprocessing of 202 records reported in:

> *An LLM-based Framework for Constructing RDF-star Knowledge Graphs from Renewable Energy Policy Documents for Stakeholder Opinion Analysis*

The production run used GPT-5.2 on July 18, 2026. Temperature, seed, and other API parameters were not explicitly set and therefore used the OpenAI API defaults.

## Files

| File | Purpose |
|---|---|
| `01-1_Hatsugen_extraction.py` | Builds and submits a Batch API job from TXT/PDF input files |
| `01-2_Hatsugen_extraction_collect.py` | Checks the batch status and saves document-level JSON results |
| `requirements.txt` | Minimal Python dependencies |
| `.env.example` | API-key configuration example |

The prompt used by the scripts is maintained separately at:

```text
../../prompts/extraction_v1.yaml
```

The Japanese prompt is authoritative. Its English reference translation is available under `../../prompts/`.

## Requirements

- Python 3.12 or later
- An OpenAI API key
- Network access to the OpenAI API

Install the dependencies:

```shell
python -m pip install -r requirements.txt
```

Copy `.env.example` to `.env` and set the API key:

```text
OPENAI_API_KEY=your-openai-api-key
```

Do not commit `.env` or an actual API key.

## Input

The submit script reads non-recursively from one input directory:

- UTF-8 text files: `*.txt`
- PDF files: `*.pdf`

TXT content is included directly in the Batch API request. PDF files are uploaded to the OpenAI Files API and referenced from the batch request. Only submit documents that may be sent to the OpenAI API.

## Usage

Run the commands from this directory so that batch metadata is stored and found consistently under the local `output/` directory.

### 1. Submit a batch

```shell
python 01-1_Hatsugen_extraction.py INPUT_DIRECTORY ../../prompts/extraction_v1.yaml
```

The script prints a Batch ID and stores local batch metadata at:

```text
output/Hatsugen_BATCH_ID.json
```

The metadata records the uploaded PDF file IDs so they can be deleted after result collection.

### 2. Collect the results

After the batch has completed:

```shell
python 01-2_Hatsugen_extraction_collect.py BATCH_ID OUTPUT_DIRECTORY
```

The collector:

1. checks the batch status;
2. displays request and error counts;
3. downloads the result JSONL;
4. writes one JSON file per input document; and
5. deletes uploaded PDF files recorded in the local batch metadata.

If the batch is still running, execute the collect command again later.

## Output format

Each output JSON contains the topic-relevant spans returned for one document. Each span identifies its boundary sentences:

```json
{
  "comments": [
    {
      "first_sentence": "...",
      "last_sentence": "..."
    }
  ],
  "comment_count": 1,
  "prompt_tokens": 0,
  "completion_tokens": 0,
  "cost": 0.0
}
```

The boundary sentences are subsequently used to recover the corresponding source-text spans. That downstream span-recovery step is not included in this minimal directory.

## Reproducibility and limitations

- Batch API processing is asynchronous and may take up to the configured 24-hour completion window.
- LLM outputs may vary across runs or model-service updates.
- Filenames without extensions are used as Batch API `custom_id` values. Input files should therefore have unique stems.
- The scripts do not recursively scan subdirectories.
- Uploaded PDF cleanup requires the local `output/Hatsugen_BATCH_ID.json` file. If collection is run from another working directory or the metadata file is lost, remove uploaded files separately.
- The output should be reviewed before use in downstream knowledge-graph construction.

---

## 日本語概要

このディレクトリには、議事録から風力発電に関連する範囲を抽出するOpenAI Batch API用スクリプトを収録しています。本番処理では、202件の議事録に対してGPT-5.2を使用し、2026年7月18日に実行しました。

処理は次の2段階です。

1. `01-1_Hatsugen_extraction.py`でTXT／PDFからバッチを登録する
2. バッチ完了後、`01-2_Hatsugen_extraction_collect.py`で文書別JSONを取得する

実際に使用した日本語プロンプトは`../../prompts/extraction_v1.yaml`にあります。入力文書はOpenAI APIへ送信されるため、送信可能な文書だけを使用してください。
