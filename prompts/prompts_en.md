# English Translation of the Prompts Used in the IJCKG 2026 Study

> **Note:** The experiments and knowledge graph construction reported in the
> paper used the original Japanese prompts provided in `prompts_ja.md`. This
> English translation is supplied only for readability and was not used in the
> reported experiments. In case of any discrepancy, the Japanese version is
> authoritative.

API keys are intentionally omitted.

## Configuration files

| Source file | Model in the supplied configuration | Purpose |
|---|---|---|
| `extraction_v1.yaml` | `gpt-5.2` | Extraction of wind-power-related spans |
| `prompt_setting.yaml` | `gpt-5.4` | Triple/opinion extraction and generalization |

The filename `extraction_v1.yaml` is a configuration filename. Its prompt
contains the extraction-definition and error-reduction components corresponding
to V6 in the prompt-variant experiment reported in the paper.

## 1. Wind-Power-Related Utterance Extraction

Source: `extraction_v1.yaml`

### System prompt

```text
You are an expert in extracting specific information from documents. Extract
all of the specified relevant utterances from the given text and output them in
JSON format.
```

### User prompt

```text
# Objective
Extract all utterances concerning wind power generation from the document and
output them in JSON format.

# Definition of an utterance concerning wind power generation
An utterance is included if it contains any of the following:
- A direct reference such as "wind power generation," "wind turbine," or
  "offshore wind power"
- An answer to the immediately preceding question concerning wind power
  generation
- An additional question or opinion responding to the immediately preceding
  answer concerning wind power generation
- A pronoun or referring expression, such as "this project" or "that matter,"
  that clearly refers to a wind-power project

# Output format (JSON)
[
    {
        "first_sentence": "string" // Extract verbatim the first sentence of
                                     the utterance concerning wind power,
        "last_sentence": "string"  // Extract verbatim the last sentence of
                                     the utterance concerning wind power
    }
]

# Additional notes
- Exclude utterances unrelated to wind power generation.
- Extract sentences verbatim from the original text. Do not summarize or edit
  them.
- If an utterance consists of one sentence, use the same sentence for
  first_sentence and last_sentence.

{text}
```

`{text}` is replaced with the input document text.

## 2. Triple and Stakeholder-Opinion Extraction

Source: `prompt_setting.yaml`, `prompt.conversion`

The original configuration labels both the opinion-extraction phase and the
JSON-conversion phase as “Stage 2.” This translation preserves that numbering.

### System prompt

````text
// Prompt for natural language to JSON conversion
//
Stage 1 of relation extraction from txt:
Read the text in txt and extract all triples appearing in it.
Extract the following three types of triples: "cause," "effect," and
"countermeasure."
A cause is the cause of an event. Retrieve every cause that appears.
An effect includes both an effect that occurs when an event happens and a
predicted effect. Retrieve every effect that appears.
A countermeasure is a measure taken in response to an event. Therefore, the
subject of a countermeasure should be the event. Retrieve every countermeasure
that appears.
If there are similar triples, do not write:
```
Air pollution/air contamination cause factory exhaust gas
```
Instead, separate them as follows:
```
Air pollution cause factory exhaust gas
Air pollution cause locomotives
```
Follow the output examples and do not add unnecessary characters or numbers.
Because evidence for each extracted relation is required, also retrieve in
detail the corresponding passage from txt.
The following are output examples:
```
Example 1: Air pollution cause factory exhaust gas
Example 2: Air pollution cause locomotives
Example 3: Air pollution effect health damage to residents
Example 4: Municipality countermeasure stronger regulations
Example 5: Increase in sika deer cause decrease in snowfall
Example 6: Increase in sika deer countermeasure prevention of agricultural
           damage
```
Stage 2 of relation extraction from txt:
Retrieve from txt the opinions related to the extracted relations.
Do not reproduce an opinion verbatim from txt; summarize it concisely.
If there is no related opinion, enter \.
Output the stakeholder name in detail.
To make clear whose opinion it is, use the following order:
stakeholder, "space," opinion
Follow the output examples and do not add unnecessary characters or numbers.
The following are examples:
```
Example 1:
Relation: Air pollution cause factory exhaust gas
Opinion: Expert requests measurement of the amount of exhaust gas
Example 2:
Relation: Municipality countermeasure stronger regulations
Opinion: Neyagawa City municipality is concerned about harm to residents'
         health
```
Stage 2 of relation extraction from txt:
Convert the two extracted types of content into JSON format.
Follow the output example and do not add unnecessary characters or numbers.
If there is no stakeholder or opinion, enter "-" in "speaker" and "content."
Put the subject in "subject," the predicate in "relation," and the object in
"object."
Put opinions in the "opinion" array.
Within the array, put the stakeholder name in "speaker" and the opinion in
"content."
Put the evidence for the relation in "txt_contents."
Use line breaks as shown in the output example.
Output a JSON file.
The following is an example of the contents of the JSON file:
```
[
{
"subject": "Air pollution",
"relation": "cause",
"object": "Factory exhaust gas",
"opinion": [
{
"speaker": "Expert",
"content": "Requests measurement of the amount of exhaust gas"
}
],
"txt_contents": "The causes of air pollution are exhaust gas from factories
and exhaust gas from automobiles"
},
{
"subject": "Municipality",
"relation": "countermeasure",
"object": "Stronger regulations",
"opinion": [
{
"speaker": "-",
"content": "-"
}
],
"txt_contents": "As a countermeasure, the municipality began strengthening
regulations"
}
]
```
````

### User prompt

```text
{text}
```

`{text}` is replaced with the source text.

## 3. Generalization

Source: `prompt_setting.yaml`, `prompt.generalization`

### System prompt

````text
// Prompt for generating generalized RDF-star vocabulary
//
You are a knowledge graph designer. To share nodes across multiple documents,
generalize the subject and object of each triple and the stakeholder (speaker
within opinion) into class names suitable for rdf:type.

[Objectives]
- Aggregate concepts of the same kind into the same class and reduce the
  number of classes.
- However, avoid integrations that destroy the meaning.

[Generalization guidelines]
1. Generalize proper nouns, place names, organization names, personal names,
   numbers, and dates into broader concepts.
2. Remove modifiers and retain only the core concept.
3. Map synonymous expressions to a unified expression.
4. Where possible, unify concepts such as "concern," "request," "evaluation,"
   "indication," and "possibility" into classes such as "action," "attitude,"
   or "state."
5. Use noun phrases that denote "things that are ..." as class names.

Examples:
"Insufficient explanation" -> "Lack of explanation" (state)
"Request for an explanation" -> "Explanation request" (action)

[Additional output rules]
- Keep class names short (approximately 3-10 Japanese characters as a guide).
- Actively integrate semantically similar expressions into the same class.
  Example: "Opposition from residents" and "Dissatisfaction among residents"
  -> "Opposition from residents"

[Output format]
For each triple, output the generalized subject (ippan_s), generalized object
(ippan_o), and generalized stakeholder (ippan_st) in JSON format.
```
[
{
"ippan_s": "Air pollution",
"ippan_o": "Exhaust gas",
"opinion": [
{
"ippan_st": "Expert"
}
],
{
"ippan_s": "Municipality",
"ippan_o": "Stronger regulations",
"opinion": [
{
"ippan_st": "-"
}
]
]
```
````

### User prompt

```text
{json}
```

`{json}` is replaced with the JSON produced by the conversion prompt.

## 4. Translation and Reproducibility Notes

- This English version is a reference translation and was not executed in the
  reported experiments.
- Translation may alter the scope, strength, or interpretation of instructions;
  it should not be assumed to produce results equivalent to the Japanese
  prompts.
- API keys are excluded and must not be committed to the repository.
- Future runs should record the model identifier, execution date, complete API
  parameters, prompt version, input-data release, and source-code commit.
- The supplied configurations did not specify temperature, seed, or other
  generation parameters; the API defaults were therefore used.
