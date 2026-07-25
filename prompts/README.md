# Prompts

This directory contains the prompts and configuration files used in the IJCKG 2026 study:

> *An LLM-based Framework for Constructing RDF-star Knowledge Graphs from Renewable Energy Policy Documents for Stakeholder Opinion Analysis*

The source documents were Japanese, so the Japanese prompts are authoritative. English translations are provided only to help readers understand the prompts.

## Files

| File | Language | Role |
|---|---|---|
| `extraction_v1.yaml` | Japanese | Configuration used for production extraction of wind-power-related spans from parliamentary records |
| `prompt_setting.yaml` | Japanese | Configuration used for triple and opinion extraction and entity generalization |
| `prompts_ja.md` | Japanese | Human-readable presentation of the prompts contained in the configuration files |
| `prompts_en.md` | English | Reference translation of the Japanese prompts; not used in the reported processing |

## Models and processing stages

| Stage | Model | Notes |
|---|---|---|
| Topic-extraction prompt comparison | GPT-4.1 and GPT-5 | Eight prompt variants were evaluated under the same settings |
| Production topic extraction | GPT-5.2 | Applied to 202 parliamentary records on July 18, 2026 |
| Triple and opinion extraction | GPT-5.4 | Applied during construction of the released RDF-star data |
| Entity generalization | GPT-5.4 | Used to map extracted entities to generalized classes |

For the OpenAI API calls reported in the study, temperature, seed, and other API parameters were left at their default settings. The exact dates of the GPT-4.1/GPT-5 prompt-comparison runs and the GPT-5.4 processing runs were not recorded.

The prompt in `extraction_v1.yaml` contains the extraction-definition and error-reduction components corresponding to V6 in the prompt-variant experiment. The complete prompt text is reproduced in `prompts_ja.md`.

## Configuration and API keys

API keys are not included in this repository. `prompt_setting.yaml` uses the placeholder:

```yaml
key: "${OPENAI_API_KEY}"
```

Set the API key securely in the execution environment. Do not write a real API key into a tracked configuration file.

These files record the prompt content and model selection used in the study. The program that loads these settings will be published separately under `src/`.

## Reproducibility notes

- The prompts were designed for Japanese renewable-energy policy documents.
- `prompts_en.md` is a reference translation and was not used to generate the released data.
- The topic-extraction prompt requests exact source spans rather than summaries.
- Triple extraction restricts causal predicates to cause, effect, and countermeasure.
- Opinion extraction associates the extracted relations with stakeholder names, opinion content, and supporting text.
- LLM outputs can vary even when API parameters are unchanged. Model-service updates and unrecorded execution dates may limit exact reproducibility.

---

## 日本語概要

このディレクトリには、論文で使用した日本語プロンプト、設定ファイル、および参考用の英訳を収録しています。

- `extraction_v1.yaml`：202件の議事録に対する本番のトピック抽出
- `prompt_setting.yaml`：トリプル・意見抽出およびエンティティの一般化
- `prompts_ja.md`：実際に使用した日本語プロンプトの読みやすい形式
- `prompts_en.md`：内容確認のための参考英訳

実験およびRDF構築には日本語版を使用しており、英訳版は使用していません。GPT-5.2による本番トピック抽出は2026年7月18日に実行しました。temperature、seed、その他のAPIパラメータはデフォルト設定です。

APIキーは公開ファイルに含めていません。実行時には環境変数などの安全な方法で設定してください。
