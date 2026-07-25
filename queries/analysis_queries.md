# SPARQL Queries Used in the IJCKG 2026 Analysis

This document lists the SPARQL queries used to analyze the RDF-star knowledge
graphs constructed from Japanese renewable-energy policy documents.

## Datasets

The analyses use two Apache Jena Fuseki datasets.

| Dataset | Content |
|---|---|
| `REFVminutesOnly` | RDF constructed from topic-relevant text extracted from 202 council-minute documents |
| `REFVja` | RDF constructed directly from all 523 documents without topic extraction |

The 202 council-minute documents in `REFVja` are identified in the default
graph by:

```sparql
?g prop:documentType kg:documentType_CouncilMinutes .
```

Here, `?g` is also the IRI of the named graph containing the RDF extracted from
that document.

## Common prefixes

```sparql
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX kg:   <https://kozaki-lab.jp/REFV-KG/data/>
PREFIX cls:  <https://kozaki-lab.jp/REFV-KG/class/>
PREFIX prop: <https://kozaki-lab.jp/REFV-KG/prop/>
```

## Applying the queries to the three analysis conditions

The queries below contain a marked `DOCUMENT FILTER` position when a
document-type restriction is applicable.

1. **Council minutes after topic extraction:** run the query on
   `REFVminutesOnly` without the document filter.
2. **Council minutes without topic extraction:** run the query on `REFVja` and
   insert the following pattern at `DOCUMENT FILTER`:

   ```sparql
   ?g prop:documentType kg:documentType_CouncilMinutes .
   ```

3. **All documents without topic extraction:** run the query on `REFVja`
   without the document filter.

## 1. Number of extracted causal triples per document

This query counts `cause`, `effect`, and `countermeasure` triples in each named
graph.

```sparql
PREFIX kg:   <https://kozaki-lab.jp/REFV-KG/data/>
PREFIX prop: <https://kozaki-lab.jp/REFV-KG/prop/>

SELECT ?g
       (SUM(IF(?p = prop:cause,          1, 0)) AS ?causeCount)
       (SUM(IF(?p = prop:effect,         1, 0)) AS ?effectCount)
       (SUM(IF(?p = prop:countermeasure, 1, 0)) AS ?countermeasureCount)
       (COUNT(*) AS ?totalCount)
WHERE {
  # DOCUMENT FILTER
  GRAPH ?g {
    ?s ?p ?o .
    VALUES ?p {
      prop:cause
      prop:effect
      prop:countermeasure
    }
  }
}
GROUP BY ?g
ORDER BY DESC(?totalCount)
```

## 2. Number of related opinions per document

The returned columns are:

- `allTripleCount`: number of causal triples;
- `relatedOpinionCount`: number of `relatedOpinion` links; and
- `tripleWithOpinionCount`: number of distinct causal triples linked to at
  least one opinion.

```sparql
PREFIX kg:   <https://kozaki-lab.jp/REFV-KG/data/>
PREFIX prop: <https://kozaki-lab.jp/REFV-KG/prop/>

SELECT ?g ?allTripleCount ?relatedOpinionCount ?tripleWithOpinionCount
WHERE {
  # DOCUMENT FILTER

  {
    SELECT ?g (COUNT(*) AS ?allTripleCount)
    WHERE {
      GRAPH ?g {
        ?s ?p ?o .
        VALUES ?p {
          prop:cause
          prop:effect
          prop:countermeasure
        }
      }
    }
    GROUP BY ?g
  }

  {
    SELECT ?g (COUNT(?opinion) AS ?relatedOpinionCount)
    WHERE {
      GRAPH ?g {
        << ?s ?p ?o >> prop:relatedOpinion ?opinion .
        VALUES ?p {
          prop:cause
          prop:effect
          prop:countermeasure
        }
      }
    }
    GROUP BY ?g
  }

  {
    SELECT ?g (COUNT(*) AS ?tripleWithOpinionCount)
    WHERE {
      {
        SELECT DISTINCT ?g ?s ?p ?o
        WHERE {
          GRAPH ?g {
            << ?s ?p ?o >> prop:relatedOpinion ?opinion .
            VALUES ?p {
              prop:cause
              prop:effect
              prop:countermeasure
            }
          }
        }
      }
    }
    GROUP BY ?g
  }
}
ORDER BY DESC(?allTripleCount)
```

When the document filter is required, add it to the outer `WHERE` clause. Its
binding of `?g` is shared with the three subquery results.

## 3. Aggregate opinion and stakeholder statistics

This query returns:

- `opinionCount`: number of distinct opinion nodes;
- `stakeholderLinkCount`: number of opinion-to-stakeholder links;
- `uniqueStakeholderCount`: number of distinct stakeholders;
- `stakeholderClassCount`: number of distinct stakeholder classes, excluding
  the generic `cls:stakeholder` class; and
- `opinionWithoutStakeholderCount`: number of opinions without a
  `prop:speaker` link.

```sparql
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX kg:   <https://kozaki-lab.jp/REFV-KG/data/>
PREFIX cls:  <https://kozaki-lab.jp/REFV-KG/class/>
PREFIX prop: <https://kozaki-lab.jp/REFV-KG/prop/>

SELECT (COUNT(DISTINCT ?opinion) AS ?opinionCount)
       (COUNT(DISTINCT
          CONCAT(STR(?opinion), "|", STR(?stakeholder)))
         AS ?stakeholderLinkCount)
       (COUNT(DISTINCT ?stakeholder) AS ?uniqueStakeholderCount)
       (COUNT(DISTINCT ?stakeholderClass) AS ?stakeholderClassCount)
       (COUNT(DISTINCT ?opinionWithoutStakeholder)
         AS ?opinionWithoutStakeholderCount)
WHERE {
  # DOCUMENT FILTER
  GRAPH ?g {
    << ?s ?p ?o >> prop:relatedOpinion ?opinion .
    VALUES ?p {
      prop:cause
      prop:effect
      prop:countermeasure
    }

    OPTIONAL {
      ?opinion prop:speaker ?stakeholder .
      OPTIONAL {
        ?stakeholder rdf:type ?stakeholderClass .
        FILTER(?stakeholderClass != cls:stakeholder)
      }
    }

    OPTIONAL {
      FILTER NOT EXISTS { ?opinion prop:speaker ?anyStakeholder }
      BIND(?opinion AS ?opinionWithoutStakeholder)
    }
  }
}
```

## 4. Stakeholders assigned to multiple specific classes

This diagnostic query checks whether a stakeholder has more than one class
other than the generic `cls:stakeholder` class.

```sparql
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX kg:   <https://kozaki-lab.jp/REFV-KG/data/>
PREFIX cls:  <https://kozaki-lab.jp/REFV-KG/class/>
PREFIX prop: <https://kozaki-lab.jp/REFV-KG/prop/>

SELECT ?stakeholder ?stakeholderLabel
       (COUNT(DISTINCT ?stakeholderClass) AS ?classCount)
       (GROUP_CONCAT(DISTINCT STR(?classLabel); separator=" | ")
         AS ?classLabels)
WHERE {
  # DOCUMENT FILTER
  GRAPH ?g {
    << ?s ?p ?o >> prop:relatedOpinion ?opinion .
    ?opinion prop:speaker ?stakeholder .
    ?stakeholder rdf:type ?stakeholderClass .
    OPTIONAL {
      ?stakeholder rdfs:label ?stakeholderLabel .
      FILTER(lang(?stakeholderLabel) = "" ||
             langMatches(lang(?stakeholderLabel), "ja"))
    }
    OPTIONAL {
      ?stakeholderClass rdfs:label ?classLabel .
      FILTER(lang(?classLabel) = "" ||
             langMatches(lang(?classLabel), "ja"))
    }
    VALUES ?p {
      prop:cause
      prop:effect
      prop:countermeasure
    }
    FILTER(?stakeholderClass != cls:stakeholder)
  }
}
GROUP BY ?stakeholder ?stakeholderLabel
HAVING(COUNT(DISTINCT ?stakeholderClass) > 1)
ORDER BY DESC(?classCount) ?stakeholder
```

## 5. Ten most frequent subject or object classes

This query was used to compare the semantic focus of triples extracted with
and without topic extraction. The inner `SELECT DISTINCT` ensures that each
document--triple--class combination is counted once, including when both the
subject and object of a triple have the same class.

```sparql
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX kg:   <https://kozaki-lab.jp/REFV-KG/data/>
PREFIX cls:  <https://kozaki-lab.jp/REFV-KG/class/>
PREFIX prop: <https://kozaki-lab.jp/REFV-KG/prop/>

SELECT ?cls ?clsLabel (COUNT(*) AS ?clsCount)
WHERE {
  {
    SELECT DISTINCT ?g ?s ?p ?o ?cls ?clsLabel
    WHERE {
      # DOCUMENT FILTER
      GRAPH ?g {
        ?s ?p ?o .
        {
          ?s rdf:type ?cls .
        }
        UNION
        {
          ?o rdf:type ?cls .
        }
        ?cls rdfs:label ?clsLabel .
        FILTER(lang(?clsLabel) = "" ||
               langMatches(lang(?clsLabel), "ja"))
        VALUES ?p {
          prop:cause
          prop:effect
          prop:countermeasure
        }
      }
    }
  }
}
GROUP BY ?cls ?clsLabel
ORDER BY DESC(?clsCount)
LIMIT 10
```

Japanese labels were used for the analysis. The labels shown in the paper's
English table are their English translations.

### 5.1 Total number of class-associated triple occurrences

The following companion query provides the denominator used to calculate the
share represented by the top ten classes.

```sparql
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX kg:   <https://kozaki-lab.jp/REFV-KG/data/>
PREFIX prop: <https://kozaki-lab.jp/REFV-KG/prop/>

SELECT (COUNT(*) AS ?totalClassOccurrences)
WHERE {
  {
    SELECT DISTINCT ?g ?s ?p ?o ?cls ?clsLabel
    WHERE {
      # DOCUMENT FILTER
      GRAPH ?g {
        ?s ?p ?o .
        {
          ?s rdf:type ?cls .
        }
        UNION
        {
          ?o rdf:type ?cls .
        }
        ?cls rdfs:label ?clsLabel .
        FILTER(lang(?clsLabel) = "" ||
               langMatches(lang(?clsLabel), "ja"))
        VALUES ?p {
          prop:cause
          prop:effect
          prop:countermeasure
        }
      }
    }
  }
}
```

This query returned 10,666 occurrences for `REFVminutesOnly` and 34,819
occurrences for the council-minute subset of `REFVja`.

## Notes

- These queries use RDF-star quoted-triple syntax (`<< ?s ?p ?o >>`) and
  therefore require an RDF-star-capable SPARQL implementation.
- Counts are computed from the named graphs that contain document-level
  extraction results. Document metadata used for filtering are stored in the
  default graph.
- Query results may change if the released RDF data are regenerated or
  corrected. Record the data release or commit identifier when reporting
  reproduced results.
