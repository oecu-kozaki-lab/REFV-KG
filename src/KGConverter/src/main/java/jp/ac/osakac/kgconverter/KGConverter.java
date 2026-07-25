package jp.ac.osakac.kgconverter;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import jp.ac.osakac.kgconverter.json.KGData;
import jp.ac.osakac.kgconverter.json.Opinion;

public class KGConverter {
	private static final Logger log = LoggerFactory.getLogger(KGConverter.class);

	/**
	 * graphとjsonを元に，TriG形式のRDFデータを生成する．
	 * 
	 * @param graph
	 * @param json
	 * @return
	 * @throws JsonMappingException
	 * @throws JsonProcessingException
	 */
	public String convert(String graph, String json) throws JsonMappingException, JsonProcessingException {
		return convert(graph, json, null);
	}

	/**
	 * graphとjsonを元に，TriG形式のRDFデータを生成する．
	 * 
	 * @param graph
	 * @param json
	 * @param relation
	 * @return
	 * @throws JsonMappingException
	 * @throws JsonProcessingException
	 */
	public String convert(String graph, String json, Path relation)
			throws JsonMappingException, JsonProcessingException {
		log.trace("convert in");
		log.trace("graph:{}", graph);
		String triples = makeTriples(json, relation);

		String quads = KGUtil.instance.makePrefix() + "\n" +
				"<" + graph + "> {\n" +
				triples +
				"}\n";

		return quads;
	}

	/**
	 * jsonを元に，Turtle-Star形式のTriplesを生成する．
	 * 
	 * @param json
	 * @param relation
	 * @return
	 * @throws JsonMappingException
	 * @throws JsonProcessingException
	 */
	private String makeTriples(String json, Path relation) throws JsonMappingException, JsonProcessingException {
		log.trace("makeTriples in");
		log.trace(" json :{}", json);
		ObjectMapper mapper = new ObjectMapper();
		List<KGData> objs = Arrays.asList(mapper.readValue(json, KGData[].class));

		StringBuilder ttl_obj = new StringBuilder();
		StringBuilder ttl_star = new StringBuilder();
		StringBuilder ttl_opinion = new StringBuilder();
		List<String> nodesSet = new ArrayList<String>(); // id_list
		List<String> typesSet = new ArrayList<String>(); // cls_list
		List<String> opinionSet = new ArrayList<String>(); // st_instance list
		List<String> stTypesSet = new ArrayList<String>(); // st_cls list
		// List<String> assigned_id = new ArrayList<String>();
		int opinion_id = 0;

		List<String> clsLabelList = new ArrayList<String>();
		List<String> stClsLabelList = new ArrayList<String>();

		if (relation != null) {
			log.info(" read id relation from :{}", relation.toString());
			readIDRelation(relation, typesSet, stTypesSet);
		}

		for (int i = 0; i < objs.size(); i++) {
			KGData obj = objs.get(i);

			// 主語ノード
			boolean idExists = nodesSet.contains(obj.getSubject());
			int subject_id = this.addObject(obj.getSubject(), nodesSet);

			int subject_type; // from cls_list
			boolean clsExists = false;
			if (obj.getIppan_s() != null) {
				clsExists = (clsLabelList.contains(obj.getIppan_s()));
				if (!clsExists) {
					clsLabelList.add(obj.getIppan_s());
				}
				subject_type = this.addObject(obj.getIppan_s(), typesSet);
			} else {
				subject_type = -1;
			}

			if (!idExists) {
				// if (assigned_id.indexOf("id_"+subject_id) < 0) {
				// assigned_id.add("id_"+subject_id);

				ttl_obj.append(
						"kg:id_" + subject_id + " rdfs:label \"" + obj.getSubject() + "\"@ja.\n");
				if (subject_type != -1) {
					ttl_obj.append(
							"kg:id_" + subject_id + " rdf:type cls:c_" + subject_type + ".\n");
					if (!clsExists) {
						// if (assigned_id.indexOf("cls_"+subject_type) < 0){
						// assigned_id.add("cls_"+subject_type);
						ttl_obj.append(
								"cls:c_" + subject_type + " rdfs:label \"" + obj.getIppan_s() + "\"@ja.\n");
					}
				}
			}

			// 目的語ノード
			idExists = nodesSet.contains(obj.getObject());
			int object_id = addObject(obj.getObject(), nodesSet);
			int object_type; // from cls_list
			if (obj.getIppan_o() != null) {
				clsExists = (clsLabelList.contains(obj.getIppan_o()));
				if (!clsExists) {
					clsLabelList.add(obj.getIppan_o());
				}
				object_type = addObject(obj.getIppan_o(), typesSet);
			} else {
				object_type = -1;
			}

			if (!idExists) {
				// if (assigned_id.indexOf("id_"+object_id) < 0) {
				// assigned_id.add("id_"+object_id);

				ttl_obj.append(
						"kg:id_" + object_id + " rdfs:label \"" + obj.getObject() + "\"@ja.\n");
				if (object_type != -1) {
					ttl_obj.append(
							"kg:id_" + object_id + " rdf:type cls:c_" + object_type + ".\n");
					if (!clsExists) {
						// if (assigned_id.indexOf("cls_"+object_type) < 0){
						// assigned_id.add("cls_"+object_type);
						ttl_obj.append(
								"cls:c_" + object_type + " rdfs:label \"" + obj.getIppan_o() + "\"@ja.\n");
					}
				}
			}

			ttl_obj.append(
					"kg:id_" + subject_id + " prop:" + KGUtil.instance.getPredicate(obj.getRelation()) + " kg:id_"
							+ object_id + ".\n");

			ttl_star.append(
					"<< kg:id_" + subject_id + " prop:" + KGUtil.instance.getPredicate(obj.getRelation()) + " kg:id_"
							+ object_id + " >>\n");

			if (obj.getOpinion() != null) {
				for (int j = 0; j < obj.getOpinion().size(); j++) {
					Opinion op = obj.getOpinion().get(j);

					// stakeholderノード
					boolean stExists = opinionSet.contains(op.getSpeaker());
					int speaker_id = (op.getSpeaker() == null || op.getSpeaker().equals("-")) ? -1
							: addObject(op.getSpeaker(), opinionSet);
					String content = op.getContent();

					int speaker_type;
					boolean stClsExists = false;
					if (op.getIppan_st() != null && !op.getIppan_st().equals("-")) {
						stClsExists = stClsLabelList.contains(op.getIppan_st());
						if (!stClsExists) {
							stClsLabelList.add(op.getIppan_st());
						}
						speaker_type = this.addObject(op.getIppan_st(), stTypesSet);
					} else {
						speaker_type = -1;
					}

					if (speaker_id > -1 && // 存在しない場合は-1
							!stExists) {
						ttl_opinion.append(
								"kg:st_" + speaker_id + " rdfs:label \"" + op.getSpeaker() + "\"@ja.\n");
						if (speaker_type != -1) {
							ttl_opinion.append(
									"kg:st_" + speaker_id + " rdf:type cls:st_" + speaker_type + ".\n");
						}
						if (!stClsExists) {
							ttl_opinion.append(
									"cls:st_" + speaker_type + " rdfs:label \"" + op.getIppan_st() + "\"@ja.\n");
						}

					}

					if (content != null && !content.equals("-")) {
						ttl_opinion.append(
								"kg:op_" + (++opinion_id) + " prop:content \"" + content + "\"@ja.\n" +
										"kg:op_" + opinion_id + " rdf:type cls:opinion.\n");

						if (speaker_id > -1) {
							ttl_opinion.append(
									"kg:op_" + opinion_id + " prop:speaker kg:st_" + speaker_id + ".\n");
						}
					}

					if (speaker_id > -1) {
						ttl_star.append(
								"    prop:stateBy kg:st_" + speaker_id + ";\n");
					}
					if (content != null && !content.equals("-")) {
						ttl_star.append(
								"    prop:relatedOpinion kg:op_" + opinion_id + ";\n");
					}

				}
			}
			ttl_star.append(
					"    prop:text-txt_contents \"" + obj.getTxt_contents() + "\"@ja.\n");

		}

		String data = KGUtil.instance.getTTlHeader() + ttl_obj.toString() + ttl_opinion.toString()
				+ ttl_star.toString();

		log.info("output data :{}", data);

		if (relation != null) {
			log.info(" write id relation to :{}", relation.toString());
			writeIDRelation(relation, typesSet, stTypesSet);
		}

		return data;

	}

	/**
	 * ラベルに応じたIDを付与して返す
	 * 
	 * @param label
	 * @param dataSet
	 * @return
	 */
	private int addObject(String label, List<String> dataSet) {
		int id = -1;
		if (dataSet.indexOf(label) < 0) {
			dataSet.add(label);
			id = dataSet.size();
			// nodes.push({id:id, label: label, color: nodeColor });
		} else {
			id = dataSet.indexOf(label) + 1;
		}
		return id;

	}

	@SuppressWarnings("unused")
	private int addObject(List<String> obj, List<String> dataSet) throws JsonProcessingException {
		ObjectMapper mapper = new ObjectMapper();

		String label = mapper.writeValueAsString(obj);

		return addObject(label, dataSet);
	}

	/*
	 * public static void main(String[] args) {
	 * String text ="[\n"
	 * + "    {\n"
	 * + "        \"subject\": \"東京23区のファミリー向け中古マンション平均価格の上昇\",\n"
	 * + "        \"relation\": \"原因\",\n"
	 * + "        \"object\": \"都心部で新築マンションの購入を諦めた人々が中古市場に流れていること\",\n"
	 * + "        \"opinion\": [\n"
	 * + "            {\n"
	 * + "                \"speaker\": \"-\",\n"
	 * + "                \"ippan_st\": \"-\",\n"
	 * + "                \"content\": \"-\"\n"
	 * + "            }\n"
	 * + "        ],\n"
	 * +
	 * "        \"txt_contents\": \"都心部で新築マンションの購入を諦めた人々が中古市場に流れていることが要因として挙げられる。\",\n"
	 * + "        \"ippan_s\": \"中古マンション価格上昇\",\n"
	 * + "        \"ippan_o\": \"新築購入断念者の流入\"\n"
	 * + "    },\n"
	 * + "    {\n"
	 * + "        \"subject\": \"東京23区のファミリー向け中古マンション平均価格の上昇\",\n"
	 * + "        \"relation\": \"原因\",\n"
	 * + "        \"object\": \"渋谷区、新宿区、千代田区、中央区、文京区、港区の高級物件が全体の価格を押し上げていること\",\n"
	 * + "        \"opinion\": [\n"
	 * + "            {\n"
	 * + "                \"speaker\": \"調査を行なった会社\",\n"
	 * + "                \"ippan_st\": \"調査会社\",\n"
	 * + "                \"content\": \"特に都心6区の高級物件が価格を押し上げているとみている\"\n"
	 * + "            }\n"
	 * + "        ],\n"
	 * +
	 * "        \"txt_contents\": \"調査を行なった会社によると、特に渋谷区、新宿区、千代田区、中央区、文京区、港区の高級物件が全体の価格を押し上げている。\",\n"
	 * + "        \"ippan_s\": \"中古マンション価格上昇\",\n"
	 * + "        \"ippan_o\": \"高級物件の影響\"\n"
	 * + "    },\n"
	 * + "    {\n"
	 * + "        \"subject\": \"東京23区のファミリー向け中古マンション平均価格の上昇\",\n"
	 * + "        \"relation\": \"影響\",\n"
	 * + "        \"object\": \"調査開始以来初めて1億2000万円を超えたこと\",\n"
	 * + "        \"opinion\": [\n"
	 * + "            {\n"
	 * + "                \"speaker\": \"-\",\n"
	 * + "                \"ippan_st\": \"-\",\n"
	 * + "                \"content\": \"-\"\n"
	 * + "            }\n"
	 * + "        ],\n"
	 * +
	 * "        \"txt_contents\": \"1月の東京23区のファミリー向け中古マンションの、70㎡換算の平均価格が、前年より33.4%上がり、調査開始以来初めて1億2000万円を超えた。\",\n"
	 * + "        \"ippan_s\": \"中古マンション価格上昇\",\n"
	 * + "        \"ippan_o\": \"平均価格の上昇\"\n"
	 * + "    },\n"
	 * + "    {\n"
	 * + "        \"subject\": \"東京23区外の中古マンション価格の下落\",\n"
	 * + "        \"relation\": \"原因\",\n"
	 * + "        \"object\": \"駅から離れた物件の販売が中心だったこと\",\n"
	 * + "        \"opinion\": [\n"
	 * + "            {\n"
	 * + "                \"speaker\": \"別の会社\",\n"
	 * + "                \"ippan_st\": \"調査会社\",\n"
	 * + "                \"content\": \"23区外は駅から遠い物件中心のため価格が下がったと示している\"\n"
	 * + "            }\n"
	 * + "        ],\n"
	 * +
	 * "        \"txt_contents\": \"別の会社の調査では、東京23区外では駅から離れた物件の販売が中心だったために価格が13.7%下がっていることがわかった。\",\n"
	 * + "        \"ippan_s\": \"中古マンション価格下落\",\n"
	 * + "        \"ippan_o\": \"駅遠物件の販売偏重\"\n"
	 * + "    },\n"
	 * + "    {\n"
	 * + "        \"subject\": \"東京23区外の中古マンション価格の下落\",\n"
	 * + "        \"relation\": \"影響\",\n"
	 * + "        \"object\": \"価格が13.7%下がっていること\",\n"
	 * + "        \"opinion\": [\n"
	 * + "            {\n"
	 * + "                \"speaker\": \"-\",\n"
	 * + "                \"ippan_st\": \"-\",\n"
	 * + "                \"content\": \"-\"\n"
	 * + "            }\n"
	 * + "        ],\n"
	 * +
	 * "        \"txt_contents\": \"別の会社の調査では、東京23区外では駅から離れた物件の販売が中心だったために価格が13.7%下がっていることがわかった。\",\n"
	 * + "        \"ippan_s\": \"中古マンション価格下落\",\n"
	 * + "        \"ippan_o\": \"価格の下落\"\n"
	 * + "    },\n"
	 * + "    {\n"
	 * + "        \"subject\": \"東京23区のファミリー向け中古マンション平均価格の上昇\",\n"
	 * + "        \"relation\": \"影響\",\n"
	 * + "        \"object\": \"都心部を中心に一部で値下げをする動きもあること\",\n"
	 * + "        \"opinion\": [\n"
	 * + "            {\n"
	 * + "                \"speaker\": \"調査を行なった会社\",\n"
	 * + "                \"ippan_st\": \"-\",\n"
	 * + "                \"content\": \"都心部中心に一部で値下げの動きもあると報告している\"\n"
	 * + "            }\n"
	 * + "        ],\n"
	 * + "        \"txt_contents\": \"また、同社は東京の都心部を中心に一部で値下げをする動きもあると報告した。\",\n"
	 * + "        \"ippan_s\": \"中古マンション価格上昇\",\n"
	 * + "        \"ippan_o\": \"値下げの動き\"\n"
	 * + "    },\n"
	 * + "    {\n"
	 * + "        \"subject\": \"東京23区のファミリー向け中古マンション平均価格の上昇\",\n"
	 * + "        \"relation\": \"影響\",\n"
	 * + "        \"object\": \"マンション用地が限られ供給も限定的な中で、上昇の勢いが続くか注目されること\",\n"
	 * + "        \"opinion\": [\n"
	 * + "            {\n"
	 * + "                \"speaker\": \"調査を行なった会社\",\n"
	 * + "                \"ippan_st\": \"調査会社\",\n"
	 * + "                \"content\": \"用地と供給が限られる中、上昇が続くか注目している\"\n"
	 * + "            }\n"
	 * + "        ],\n"
	 * +
	 * "        \"txt_contents\": \"同社は今回の価格上昇についてNHKの取材に対し「マンション用地も限られ、供給も限定的となる中、いまの上昇の勢いが続くか注目される」と話した。\",\n"
	 * + "        \"ippan_s\": \"中古マンション価格上昇\",\n"
	 * + "        \"ippan_o\": \"上昇継続の注目\"\n"
	 * + "    }\n"
	 * + "]";
	 * String text2 ="[\n"
	 * + "    {\n"
	 * + "        \"subject\": \"東京23区のファミリー向け中古マンション平均価格の上昇A\",\n"
	 * + "        \"relation\": \"原因\",\n"
	 * + "        \"object\": \"都心部で新築マンションの購入を諦めた人々が中古市場に流れていること2\",\n"
	 * + "        \"opinion\": [\n"
	 * + "            {\n"
	 * + "                \"speaker\": \"調査を行なった会社A\",\n"
	 * + "                \"content\": \"中古市場に流れている\",\n"
	 * + "                \"ippan_st\": \"調査会社\"\n"
	 * + "            }\n"
	 * + "        ],\n"
	 * +
	 * "        \"txt_contents\": \"都心部で新築マンションの購入を諦めた人々が中古市場に流れていることが要因として挙げられる。\",\n"
	 * + "        \"ippan_s\": \"中古マンション価格上昇A\",\n"
	 * + "        \"ippan_o\": \"新築購入断念者の流入\"\n"
	 * + "    },\n"
	 * + "    {\n"
	 * + "        \"subject\": \"東京23区のファミリー向け中古マンション平均価格の上昇\",\n"
	 * + "        \"relation\": \"原因\",\n"
	 * + "        \"object\": \"都心部で新築マンションの購入を諦めた人々が中古市場に流れていること\",\n"
	 * + "        \"opinion\": [\n"
	 * + "            {\n"
	 * + "                \"speaker\": \"-\",\n"
	 * + "                \"content\": \"-\",\n"
	 * + "                \"ippan_st\": \"-\"\n"
	 * + "            }\n"
	 * + "        ],\n"
	 * +
	 * "        \"txt_contents\": \"都心部で新築マンションの購入を諦めた人々が中古市場に流れていることが要因として挙げられる。\",\n"
	 * + "        \"ippan_s\": \"中古マンション価格上昇\",\n"
	 * + "        \"ippan_o\": \"新築購入断念者の流入\"\n"
	 * + "    },\n"
	 * + "    {\n"
	 * + "        \"subject\": \"東京23区のファミリー向け中古マンション平均価格の上昇\",\n"
	 * + "        \"relation\": \"原因\",\n"
	 * + "        \"object\": \"渋谷区、新宿区、千代田区、中央区、文京区、港区の高級物件が全体の価格を押し上げていること\",\n"
	 * + "        \"opinion\": [\n"
	 * + "            {\n"
	 * + "                \"speaker\": \"調査を行なった会社\",\n"
	 * + "                \"content\": \"特に都心6区の高級物件が価格を押し上げているとみている\",\n"
	 * + "                \"ippan_st\": \"調査会社\"\n"
	 * + "            }\n"
	 * + "        ],\n"
	 * +
	 * "        \"txt_contents\": \"調査を行なった会社によると、特に渋谷区、新宿区、千代田区、中央区、文京区、港区の高級物件が全体の価格を押し上げている。\",\n"
	 * + "        \"ippan_s\": \"中古マンション価格上昇\",\n"
	 * + "        \"ippan_o\": \"高級物件の影響\"\n"
	 * + "    },\n"
	 * + "    {\n"
	 * + "        \"subject\": \"東京23区のファミリー向け中古マンション平均価格の上昇\",\n"
	 * + "        \"relation\": \"影響\",\n"
	 * + "        \"object\": \"調査開始以来初めて1億2000万円を超えたこと\",\n"
	 * + "        \"opinion\": [\n"
	 * + "            {\n"
	 * + "                \"speaker\": \"-\",\n"
	 * + "                \"content\": \"-\",\n"
	 * + "                \"ippan_st\": \"-\"\n"
	 * + "            }\n"
	 * + "        ],\n"
	 * +
	 * "        \"txt_contents\": \"1月の東京23区のファミリー向け中古マンションの、70㎡換算の平均価格が、前年より33.4%上がり、調査開始以来初めて1億2000万円を超えた。\",\n"
	 * + "        \"ippan_s\": \"中古マンション価格上昇\",\n"
	 * + "        \"ippan_o\": \"平均価格の上昇\"\n"
	 * + "    },\n"
	 * + "    {\n"
	 * + "        \"subject\": \"東京23区外の中古マンション価格の下落\",\n"
	 * + "        \"relation\": \"原因\",\n"
	 * + "        \"object\": \"駅から離れた物件の販売が中心だったこと\",\n"
	 * + "        \"opinion\": [\n"
	 * + "            {\n"
	 * + "                \"speaker\": \"別の会社\",\n"
	 * + "                \"content\": \"23区外は駅から遠い物件中心のため価格が下がったと示している\",\n"
	 * + "                \"ippan_st\": \"調査会社\"\n"
	 * + "            }\n"
	 * + "        ],\n"
	 * +
	 * "        \"txt_contents\": \"別の会社の調査では、東京23区外では駅から離れた物件の販売が中心だったために価格が13.7%下がっていることがわかった。\",\n"
	 * + "        \"ippan_s\": \"中古マンション価格下落\",\n"
	 * + "        \"ippan_o\": \"駅遠物件の販売偏重\"\n"
	 * + "    },\n"
	 * + "    {\n"
	 * + "        \"subject\": \"東京23区外の中古マンション価格の下落\",\n"
	 * + "        \"relation\": \"影響\",\n"
	 * + "        \"object\": \"価格が13.7%下がっていること\",\n"
	 * + "        \"opinion\": [\n"
	 * + "            {\n"
	 * + "                \"speaker\": \"-\",\n"
	 * + "                \"ippan_st\": \"-\",\n"
	 * + "                \"content\": \"-\"\n"
	 * + "            }\n"
	 * + "        ],\n"
	 * +
	 * "        \"txt_contents\": \"別の会社の調査では、東京23区外では駅から離れた物件の販売が中心だったために価格が13.7%下がっていることがわかった。\",\n"
	 * + "        \"ippan_s\": \"中古マンション価格下落\",\n"
	 * + "        \"ippan_o\": \"価格の下落\"\n"
	 * + "    },\n"
	 * + "    {\n"
	 * + "        \"subject\": \"東京23区のファミリー向け中古マンション平均価格の上昇\",\n"
	 * + "        \"relation\": \"影響\",\n"
	 * + "        \"object\": \"都心部を中心に一部で値下げをする動きもあること\",\n"
	 * + "        \"opinion\": [\n"
	 * + "            {\n"
	 * + "                \"speaker\": \"調査を行なった会社\",\n"
	 * + "                \"ippan_st\": \"調査会社\",\n"
	 * + "                \"content\": \"都心部中心に一部で値下げの動きもあると報告している\"\n"
	 * + "            }\n"
	 * + "        ],\n"
	 * + "        \"txt_contents\": \"また、同社は東京の都心部を中心に一部で値下げをする動きもあると報告した。\",\n"
	 * + "        \"ippan_s\": \"中古マンション価格上昇\",\n"
	 * + "        \"ippan_o\": \"値下げの動き\"\n"
	 * + "    },\n"
	 * + "    {\n"
	 * + "        \"subject\": \"東京23区のファミリー向け中古マンション平均価格の上昇\",\n"
	 * + "        \"relation\": \"影響\",\n"
	 * + "        \"object\": \"マンション用地が限られ供給も限定的な中で、上昇の勢いが続くか注目されること\",\n"
	 * + "        \"opinion\": [\n"
	 * + "            {\n"
	 * + "                \"speaker\": \"調査を行なった会社\",\n"
	 * + "                \"ippan_st\": \"調査会社\",\n"
	 * + "                \"content\": \"用地と供給が限られる中、上昇が続くか注目している\"\n"
	 * + "            }\n"
	 * + "        ],\n"
	 * +
	 * "        \"txt_contents\": \"同社は今回の価格上昇についてNHKの取材に対し「マンション用地も限られ、供給も限定的となる中、いまの上昇の勢いが続くか注目される」と話した。\",\n"
	 * + "        \"ippan_s\": \"中古マンション価格上昇\",\n"
	 * + "        \"ippan_o\": \"上昇継続の注目\"\n"
	 * + "    }\n"
	 * + "]";
	 * String text3 =
	 * "[{\"subject\":\"高齢者の熱中症\",\"ippan_s\":\"高齢者の熱中症\",\"relation\":\"原因\",\"object\":\"エアコン不使用\",\"ippan_o\":\"エアコン不使用\",\"opinion\":[{\"speaker\":\"山形県消防救急課\",\"content\":\"高齢者を中心にエアコンを使わず体調悪化のケースが目立つ\",\"ippan_st\":\"消防救急課\"}],\"txt_contents\":\"発生場所は、住居など敷地内が最も多く、高齢者を中心にエアコンを使わず、体のしびれなどで搬送されるケースが目立つとしています。\"},{\"subject\":\"高齢者の熱中症\",\"ippan_s\":\"高齢者の熱中症\",\"relation\":\"影響\",\"object\":\"救急搬送や死亡者の増加\",\"ippan_o\":\"救急搬送や死亡者の増加\",\"opinion\":[{\"speaker\":\"本間信一議員\",\"content\":\"幅広い年代で熱中症の症状訴え搬送が後を絶たない危険な暑さの夏\",\"ippan_st\":\"議員\"}],\"txt_contents\":\"熱中症で救急搬送された人数も調査開始以来、２番目に多いということであります。小さなお子様から小・中学生、部活動中の子供たち、外で働いておられる成人や住居内で具合の悪くなる高齢者まで、幅広い年代で熱中症の症状を訴え、搬送されるケースが後を絶たない危険な暑さの夏と言えます。\"},{\"subject\":\"熱中症\",\"ippan_s\":\"熱中症\",\"relation\":\"対策\",\"object\":\"涼み処（クーリングシェルター）の設置・公共施設開放\",\"ippan_o\":\"涼み処の設置・公共施設開放\",\"opinion\":[{\"speaker\":\"健康福祉部長\",\"content\":\"猛暑からの避難場所『涼み処』を設置し公共施設を開放\",\"ippan_st\":\"健康福祉部長\"}],\"txt_contents\":\"今年は例年より厳しい暑さが続いたことから、急遽の対策ということで、猛暑からの避難場所として涼み処を設置をいたしまして、総合保健福祉センターにこふる、荘銀タクト鶴岡、図書館及び各地区のコミュニティセンターなど公共施設46か所を開放をしたところでございます。\"},{\"subject\":\"熱中症警戒アラート\",\"ippan_s\":\"熱中症警戒アラート\",\"relation\":\"対策\",\"object\":\"LINEやSNS、市ホームページ等での注意喚起\",\"ippan_o\":\"LINEやSNS、市ホームページでの注意喚起\",\"opinion\":[{\"speaker\":\"健康福祉部長\",\"content\":\"LINE、Facebook、子育てアプリで注意喚起\",\"ippan_st\":\"健康福祉部長\"}],\"txt_contents\":\"８月に入りまして熱中症警戒アラートの発表が続きましたので、ライン、フェイスブック、子育てアプリ母子モにおいて改めて注意喚起を行っております。\"},{\"subject\":\"熱中症\",\"ippan_s\":\"熱中症\",\"relation\":\"対策\",\"object\":\"民生委員等による高齢者見守り・訪問と注意喚起\",\"ippan_o\":\"高齢者見守り・訪問と注意喚起\",\"opinion\":[{\"speaker\":\"健康福祉部長\",\"content\":\"民生委員が独り暮らし高齢者宅を訪問し熱中症注意喚起\",\"ippan_st\":\"健康福祉部長\"}],\"txt_contents\":\"家族からのお声かけや見守りが行えない独り暮らしの高齢者に対して、民生委員にお願いしまして、見守り活動で御自宅を訪問する際に、熱中症への注意を呼びかけていただくとともに...\"},{\"subject\":\"熱中症\",\"ippan_s\":\"熱中症\",\"relation\":\"対策\",\"object\":\"ケーブルテレビ・防災無線等による呼びかけ\",\"ippan_o\":\"ケーブルテレビ・防災無線での呼びかけ\",\"opinion\":[{\"speaker\":\"健康福祉部長\",\"content\":\"ケーブルテレビや防災無線で呼びかけを実施\",\"ippan_st\":\"健康福祉部長\"}],\"txt_contents\":\"各地域庁舎でもケーブルテレビや防災無線による呼びかけを行いまして、百歳体操をはじめとした介護予防に取り組んでいる活動団体にも運動の中止や活動時間を短縮するなど、暑い時期の活動内容や方法について注意喚起を行っているところでございます。\"},{\"subject\":\"熱中症\",\"ippan_s\":\"熱中症\",\"relation\":\"対策\",\"object\":\"防災行政無線による注意喚起の検討\",\"ippan_o\":\"防災行政無線での注意喚起の検討\",\"opinion\":[{\"speaker\":\"危機管理監\",\"content\":\"今後は防災無線や地域の伝達手段での対応を検討\",\"ippan_st\":\"危機管理監\"}],\"txt_contents\":\"防災行政無線以外にも地域にはケーブルテレビですとか、戸別受信機等がございますけれども、今後それぞれの運用の中での対応を検討してまいりたいと考えているところでございます。\"},{\"subject\":\"涼み処の周知\",\"ippan_s\":\"涼み処の周知\",\"relation\":\"対策\",\"object\":\"施設入口表示やホームページによる案内改善\",\"ippan_o\":\"施設入口表示やホームページでの案内改善\",\"opinion\":[{\"speaker\":\"健康福祉部長\",\"content\":\"遠方からも分かる案内掲示など外からも確認できる対策を講じたい\",\"ippan_st\":\"健康福祉部長\"}],\"txt_contents\":\"遠方からも確認できるような対策といったことを講じていきたいと考えております。\"},{\"subject\":\"高齢者見守り事業\",\"ippan_s\":\"高齢者見守り事業\",\"relation\":\"対策\",\"object\":\"あんしん見守りコール事業の運営・利用条件見直し\",\"ippan_o\":\"あんしん見守りコール事業の運営・利用条件見直し\",\"opinion\":[{\"speaker\":\"健康福祉部長\",\"content\":\"利用条件の見直しや利用促進を検討\",\"ippan_st\":\"健康福祉部長\"}],\"txt_contents\":\"今後さらに利用しやすい事業となるよう利用条件の見直しなんかを検討いたしまして、必要とする多くの方の利用といったことに周知をしていきたいと考えております。\"},{\"subject\":\"高齢者見守り事業\",\"ippan_s\":\"高齢者見守り事業\",\"relation\":\"影響\",\"object\":\"利用者数減少（対象者5,048人に対し加入1.3%）\",\"ippan_o\":\"利用者数減少\",\"opinion\":[{\"speaker\":\"本間信一議員\",\"content\":\"事業参加者が非常に少なく利用促進を要望\",\"ippan_st\":\"議員\"}],\"txt_contents\":\"独り暮らしの高齢者は令和５年度で本市では5,048人いるとのことです。それで、事業参加者は、先ほどありましたように67名、僅か1.3％ぐらいしか参加されていないということであります。\"}]\n";
	 * String text4 =
	 * "[{\"subject\":\"東京23区のファミリー向け中古マンション価格\",\"ippan_s\":\"新築マンション価格高騰による需要移行\",\"relation\":\"原因\",\"object\":\"都心部で新築マンションの購入を諦めた人々が中古市場に流れている\",\"ippan_o\":\"都心部で新築マンションの購入を諦めた人々が中古市場に流れている\",\"opinion\":[{\"speaker\":\"調査会社担当者\",\"content\":\"新築マンションの価格高騰で中古マンションへ需要が移っている\",\"ippan_st\":\"調査会社担当者\"}],\"txt_contents\":\"都心部で新築マンションの購入を諦めた人々が中古市場に流れていることが要因として挙げられる\"},{\"subject\":\"東京23区のファミリー向け中古マンション価格\",\"ippan_s\":\"東京23区のファミリー向け中古マンション価格上昇\",\"relation\":\"影響\",\"object\":\"70㎡換算の平均価格が前年より33.4%上がり、初めて1億2000万円を超えた\",\"ippan_o\":\"70㎡換算の平均価格が前年より33.4%上がり、初めて1億2000万円を超えた\",\"opinion\":[{\"speaker\":\"-\",\"content\":\"-\",\"ippan_st\":\"-\"}],\"txt_contents\":\"6月の東京23区のファミリー向け中古マンションの、70㎡換算の平均価格が、前年より33.4%上がり、調査開始以来初めて1億2000万円を超えた\"},{\"subject\":\"高級物件の存在\",\"ippan_s\":\"東京23区高級物件価格上昇\",\"relation\":\"影響\",\"object\":\"渋谷区、新宿区、千代田区、中央区、文京区、港区の高級物件が全体の価格を押し上げている\",\"ippan_o\":\"渋谷区、新宿区、千代田区、中央区、文京区、港区の高級物件が全体の価格を押し上げている\",\"opinion\":[{\"speaker\":\"-\",\"content\":\"-\",\"ippan_st\":\"-\"}],\"txt_contents\":\"特に渋谷区、新宿区、千代田区、中央区、文京区、港区の高級物件が全体の価格を押し上げている\"},{\"subject\":\"東京23区中古マンション価格\",\"ippan_s\":\"東京23区中古マンション価格対策\",\"relation\":\"対策\",\"object\":\"都心部を中心に一部で値下げをする動き\",\"ippan_o\":\"都心部を中心に一部で値下げをする動き\",\"opinion\":[{\"speaker\":\"調査会社担当者\",\"content\":\"一部エリアで価格調整の動きが出ている\",\"ippan_st\":\"調査会社担当者\"}],\"txt_contents\":\"東京の都心部を中心に一部で値下げをする動きもあると報告した\"},{\"subject\":\"東京23区外の中古マンション価格\",\"ippan_s\":\"東京23区外中古マンション価格下落\",\"relation\":\"原因\",\"object\":\"駅から離れた物件の販売が中心だった\",\"ippan_o\":\"駅から離れた物件の販売が中心だった\",\"opinion\":[{\"speaker\":\"-\",\"content\":\"-\",\"ippan_st\":\"-\"}],\"txt_contents\":\"東京23区外では駅から離れた物件の販売が中心だったために価格が13.7%下がっている\"},{\"subject\":\"東京23区外の中古マンション価格\",\"ippan_s\":\"東京23区外中古マンション価格下落\",\"relation\":\"影響\",\"object\":\"価格が13.7%下がっている\",\"ippan_o\":\"価格が13.7%下がっている\",\"opinion\":[{\"speaker\":\"-\",\"content\":\"-\",\"ippan_st\":\"-\"}],\"txt_contents\":\"東京23区外では駅から離れた物件の販売が中心だったために価格が13.7%下がっている\"},{\"subject\":\"東京23区のファミリー向け中古マンション価格の上昇\",\"ippan_s\":\"東京23区ファミリー向け中古マンション価格上昇の影響\",\"relation\":\"影響\",\"object\":\"マンション用地も限られ供給も限定的となる中、今後の上昇の勢いが注目されている\",\"ippan_o\":\"マンション用地も限られ供給も限定的となる中、今後の上昇の勢いが注目されている\",\"opinion\":[{\"speaker\":\"調査会社担当者\",\"content\":\"供給が限られることで今後の価格動向に注目している\",\"ippan_st\":\"調査会社担当者\"}],\"txt_contents\":\"マンション用地も限られ、供給も限定的となる中、いまの上昇の勢いが続くか注目される\"}]";
	 * KGConverter kg = new KGConverter();
	 * try {
	 * // System.out.println(kg.convert("http://example.com/KG/00001", text2));
	 * System.out.println(kg.convert("http://example.com/KG/00002", text));
	 * System.out.println(kg.convert("http://example.com/KG/00003", text2,
	 * Paths.get("./test_rel_json")));
	 * System.out.println(kg.convert("http://example.com/KG/00004", text,
	 * Paths.get("./test_rel_json")));
	 * // System.out.println(kg.convert("http://example.com/KG/00001", text4));
	 * 
	 * } catch (JsonMappingException e) {
	 * // TODO 自動生成された catch ブロック
	 * e.printStackTrace();
	 * } catch (JsonProcessingException e) {
	 * // TODO 自動生成された catch ブロック
	 * e.printStackTrace();
	 * }
	 * 
	 * }
	 */

	private void readIDRelation(Path path, List<String> cls_list, List<String> st_cls_list) {
		Map<String, List<String>> map = null;
		ObjectMapper mapper = new ObjectMapper();
		TypeReference<Map<String, List<String>>> ref = new TypeReference<Map<String, List<String>>>() {
		};
		try {
			map = mapper.readValue(path.toFile(), ref);

			if (map.containsKey("cls_list")) {
				cls_list.addAll(map.get("cls_list"));
			}
			if (map.containsKey("st_cls_list")) {
				st_cls_list.addAll(map.get("st_cls_list"));
			}
		} catch (FileNotFoundException e) {
			log.info("json file '{}' not found. it will be made.", path.toString());
		} catch (IOException e) {
			// TODO 自動生成された catch ブロック
			e.printStackTrace();
		}

	}

	private void writeIDRelation(Path path, List<String> cls_list, List<String> st_cls_list) {
		Map<String, List<String>> map = new HashMap<String, List<String>>();

		map.put("cls_list", cls_list);
		map.put("st_cls_list", st_cls_list);

		ObjectMapper mapper = new ObjectMapper();
		try {
			mapper.writeValue(path.toFile(), map);
		} catch (IOException e) {
			// TODO 自動生成された catch ブロック
			e.printStackTrace();
		}

	}
}
