# SPARQL Queries

This directory contains the SPARQL queries used to analyze the RDF-star knowledge graphs released with the IJCKG 2026 study:

> *An LLM-based Framework for Constructing RDF-star Knowledge Graphs from Renewable Energy Policy Documents for Stakeholder Opinion Analysis*

## Files

| File | Description |
|---|---|
| `analysis_queries.md` | Documented SPARQL queries used for the paper's aggregate statistics and comparison of processing conditions |

## Query groups

`analysis_queries.md` includes queries for:

1. causal-triple counts by document and predicate;
2. opinion associations by document;
3. aggregate opinion and stakeholder statistics;
4. detection of stakeholders assigned to multiple specific classes;
5. the ten most frequent subject or object classes; and
6. the total number of class-associated causal-triple occurrences.

The queries use the following causal predicates:

- `prop:cause`
- `prop:effect`
- `prop:countermeasure`

## Preparing the RDF datasets

Before running the queries, load the relevant manifest and document-level RDF files into the same RDF dataset:

- Load the Turtle manifest into the default graph.
- Load the corresponding TriG files into the same dataset.
- The TriG files already contain their document-level named graph IRIs.

Recommended combinations are:

| Analysis condition | Default graph | Named graphs |
|---|---|---|
| Parliamentary records after topic extraction | `../data/metadata/minutes_topic_extracted_manifest.ttl` | All TriG files under `../data/rdf/minutes_topic_extracted/` |
| All documents without topic extraction | `../data/metadata/all_documents_manifest.ttl` | All TriG files under `../data/rdf/all_documents/` |

See [`../data/README.md`](../data/README.md) for complete loading instructions.

## Applying queries to the three conditions

The paper compares three analysis conditions:

1. **Parliamentary records after topic extraction**  
   Run the query against the topic-extracted parliamentary-record dataset without a document filter.

2. **The same parliamentary records without topic extraction**  
   Run the query against the all-document dataset and add the following pattern in the default graph:

   ```sparql
   ?g prop:documentType kg:documentType_CouncilMinutes .
   ```

3. **All documents without topic extraction**  
   Run the query against the all-document dataset without the document filter.

In these queries, `?g` is both the document resource described by the manifest in the default graph and the IRI of the named graph containing the RDF extracted from that document.

## Common prefixes

```sparql
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX kg:   <https://kozaki-lab.jp/REFV-KG/data/>
PREFIX cls:  <https://kozaki-lab.jp/REFV-KG/class/>
PREFIX prop: <https://kozaki-lab.jp/REFV-KG/prop/>
```

## Compatibility and interpretation

- The queries were developed for Apache Jena Fuseki and RDF-star data organized with named graphs.
- Aggregate counts depend on whether duplicate occurrences are retained. Follow the query descriptions in `analysis_queries.md` when reproducing the paper's tables.
- A triple may be associated with multiple opinions or stakeholders. Link counts should not automatically be interpreted as counts of unique resources.
- Class-frequency queries count occurrences associated with causal triples, not merely the number of distinct class IRIs.
- Machine-translated English literals can be added as described in the data README. Use language filters such as `FILTER(LANG(?label) = "en")` when selecting English labels.

---

## 日本語概要

このディレクトリには、論文の分析で使用したSPARQLクエリを収録しています。クエリを実行する前に、対応するTurtleマニフェストをデフォルトグラフへ、文書別TriGを同じRDFデータセットへ格納してください。

論文では次の3条件を比較しています。

1. トピック抽出後の議事録
2. トピック抽出なしの同じ議事録
3. トピック抽出なしの全文書

全文書版から議事録だけを選択する場合は、デフォルトグラフで次の条件を使用します。

```sparql
?g prop:documentType kg:documentType_CouncilMinutes .
```

個々のクエリの目的、集計単位、重複の扱い、適用条件については`analysis_queries.md`を参照してください。
