# REFV-KG

**Renewable Energy Future Vision Knowledge Graph**  
**再生可能エネルギー将来ビジョン知識グラフ**

REFV-KG is an RDF-star knowledge graph constructed from heterogeneous Japanese renewable-energy policy documents. It represents causal relations—causes, effects, and countermeasures—together with stakeholder opinions and supporting source text.

This repository provides the data, prompts, SPARQL queries, and minimum source code associated with the following paper submitted to IJCKG 2026:

> *An LLM-based Framework for Constructing RDF-star Knowledge Graphs from Renewable Energy Policy Documents for Stakeholder Opinion Analysis*

## Repository contents

```text
REFV-KG/
├─ data/                       RDF-star data and document manifests
│  ├─ metadata/               TSV and Turtle document manifests
│  └─ rdf/
│     ├─ all_documents/       523 documents processed without topic extraction
│     ├─ minutes_topic_extracted/
│     │                       Parliamentary records processed after topic extraction
│     └─ supplementary/       Optional English machine-translated literals
├─ prompts/                    Japanese prompts and English reference translations
├─ queries/                    SPARQL queries used in the paper's analyses
├─ src/
│  ├─ topic_extraction/       GPT-5.2 Batch API topic-extraction scripts
│  └─ KGConverter/            Extraction, generalization, and RDF-star conversion
└─ docs/                      Files used by the project's GitHub Pages site
```

Detailed instructions are available in each directory:

- [Data and manifests](data/README.md)
- [Prompts](prompts/README.md)
- [SPARQL queries](queries/README.md)
- [Topic-extraction scripts](src/topic_extraction/README.md)
- [Knowledge-graph converter](src/KGConverter/README.md)

## Released datasets

### All documents

The all-document dataset was constructed by processing the full text of 523 documents without topic extraction.

| Region | Documents |
|---|---:|
| Akita | 66 |
| Hokkaido | 151 |
| Shimane | 36 |
| Yamagata | 270 |
| **Total** | **523** |

The collection includes parliamentary records, administrative and environmental-assessment materials, review-board documents, governmental and business statements, news reports, Web articles, and materials from citizen organizations. The resulting graph contains 22,922 causal triples.

### Parliamentary records after topic extraction

GPT-5.2 was used to extract wind-power-related text from 202 parliamentary records on July 18, 2026.

- Topic-relevant text was extracted from 196 records.
- RDF files were generated for 193 records.
- 192 RDF files contain at least one causal triple.
- One RDF file contains document metadata but no causal triple.

The same 202 records are included in the all-document dataset without topic extraction, enabling comparison of the two processing conditions.

### Optional English literals

`data/rdf/supplementary/all_documents_en_machine_translated_2026-07-20.nq` contains automatically translated English literals for the all-document dataset. Load it in addition to the Japanese RDF to enable language-tag-based retrieval in Japanese and English.

The translations have not been fully reviewed by human translators and may contain errors or inconsistent terminology.

## Loading the RDF

To run the example and analysis queries, load a manifest and its corresponding document-level RDF files into the same RDF dataset in an RDF-star-compatible triple store.

1. Load the appropriate Turtle manifest from `data/metadata/` into the default graph.
2. Load the corresponding TriG files into the same RDF dataset.
3. Each TriG file already specifies its document-level named graph IRI.

| Processing condition | Default graph | Named graphs |
|---|---|---|
| All documents without topic extraction | `data/metadata/all_documents_manifest.ttl` | All TriG files under `data/rdf/all_documents/` |
| Parliamentary records after topic extraction | `data/metadata/minutes_topic_extracted_manifest.ttl` | All TriG files under `data/rdf/minutes_topic_extracted/` |

See [data/README.md](data/README.md) for detailed instructions and a language-specific query example.

## Processing workflow

```text
Policy documents
    → optional topic extraction
    → cause/effect/countermeasure extraction
    → stakeholder and opinion extraction
    → subject/object/stakeholder generalization
    → document-level RDF-star conversion
    → SPARQL analysis
```

The original Japanese prompts used for processing are provided under `prompts/`. English translations are supplied only for readability and were not used to generate the released data.

## Main namespaces

```sparql
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX kg:   <https://kozaki-lab.jp/REFV-KG/data/>
PREFIX cls:  <https://kozaki-lab.jp/REFV-KG/class/>
PREFIX prop: <https://kozaki-lab.jp/REFV-KG/prop/>
```

The principal causal predicates are:

- `prop:cause`
- `prop:effect`
- `prop:countermeasure`

## Reproducibility and limitations

- The released RDF was generated using LLM-based processing and may contain extraction, generalization, classification, or translation errors.
- The current class organization is preliminary and is not a complete renewable-energy ontology.
- The topic-extracted dataset mainly targets wind-power-related content.
- OpenAI API parameters such as temperature and seed were left at their defaults.
- Exact execution dates were not recorded for all processing stages. The production GPT-5.2 topic-extraction run was conducted on July 18, 2026.
- The original source documents and intermediate topic-extracted text files are not redistributed in this repository.
- Source filenames and document metadata are provided for traceability; the original documents remain subject to the terms and rights of their respective providers.
- Input documents processed with the supplied programs are sent to the OpenAI API.

## Citation

When using these resources, please cite the associated paper:

> *An LLM-based Framework for Constructing RDF-star Knowledge Graphs from Renewable Energy Policy Documents for Stakeholder Opinion Analysis*. Submitted to IJCKG 2026.

Complete bibliographic information will be added after publication.

---

## 日本語概要

REFV-KGは、日本語の再生可能エネルギー政策文書から構築したRDF-starナレッジグラフです。原因・影響・対策の因果関係を、ステークホルダーの意見および根拠となる原文と関連付けて表現しています。

本リポジトリでは、IJCKG 2026投稿論文に関連する以下のリソースを公開しています。

- 523文書から構築した全文書版RDF
- トピック抽出後の議事録版RDF
- RDFと抽出元文書を対応付けるTSV／Turtleマニフェスト
- 実際に使用した日本語プロンプトと参考英訳
- 論文の分析で使用したSPARQLクエリ
- トピック抽出、トリプル・意見抽出、一般化、RDF-star変換のプログラム
- 全文書版へ追加できる英語機械翻訳リテラル

サンプルクエリを実行する際は、対応するTurtleマニフェストをデフォルトグラフへ、文書別TriGを同じRDFデータセットへ格納してください。詳しい格納方法、各ファイルの説明、既知の制約については、各ディレクトリのREADMEを参照してください。
