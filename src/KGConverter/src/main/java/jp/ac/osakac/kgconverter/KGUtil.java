package jp.ac.osakac.kgconverter;

import java.util.HashMap;
import java.util.Map;

public class KGUtil {

	public static KGUtil instance = new KGUtil();

	private Map<String, String> prefix;
	private Map<String, String> preds;
	private StringBuilder ttl_header = new StringBuilder(
			"#共通利用するクラス・関係の定義は与えておく\n" +
					"cls:opinion rdfs:label \"意見\"@ja .\n" +
					"cls:stakeholder rdfs:label \"ステークホルダー\"@ja .\n");

	public KGUtil() {
		this.prefix = new HashMap<String, String>();
		this.prefix.put("rdf", "http://www.w3.org/1999/02/22-rdf-syntax-ns#");
		this.prefix.put("rdfs", "http://www.w3.org/2000/01/rdf-schema#");
		this.prefix.put("kg", "https://kozaki-lab.jp/REFV-KG/data/");
		this.prefix.put("cls", "https://kozaki-lab.jp/REFV-KG/class/");
		this.prefix.put("prop", "https://kozaki-lab.jp/REFV-KG/prop/");

		this.preds = new HashMap<String, String>();
		this.preds.put("原因", "cause");
		this.preds.put("影響", "effect");
		this.preds.put("対策", "countermeasure");
		this.preds.put("発言者", "speaker");
		this.preds.put("意見内容", "content");
		this.preds.put("元テキスト", "text-txt_contents");

		this.preds.keySet().forEach(key -> {
			ttl_header.append(
					"prop:" + this.preds.get(key) + "\n" +
							" a rdf:Property ;\n" +
							" rdfs:label \"" + key + "\"@ja .\n");
		});
		ttl_header.append(
				"prop:opinion rdfs:label \"意見\"@ja .\n" +
						"prop:statedBy\n" +
						"  a rdf:Property ;\n" +
						"  rdfs:label \"発言者\"@ja ;\n" +
						"  rdfs:comment \"当該主張・意見を述べた主体\"@ja .\n");

	}

	/**
	 * queryのprefixを返す
	 * 
	 * @return queryのprefix
	 */
	public String makePrefix() {
		StringBuilder sb = new StringBuilder();
		this.prefix.keySet().forEach(key -> {
			sb.append("PREFIX " + key + ": <" + this.prefix.get(key) + ">\n");
		});
		return sb.toString();
	}

	public String makeResource(String res) {
		return null; // TODO
	}

	/**
	 * RDF-Star形式のTurtleヘッダを返す
	 * 
	 * @return Turtleのヘッダ
	 */
	public String getTTlHeader() {
		return this.ttl_header.toString();
	}

	/**
	 * 関連の文字列に応じたpropのtypeを返す
	 * 
	 * @param relation 関連の種別
	 * @return predicateの文字列に応じたprop種別
	 */
	public String getPredicate(String relation) {
		String pred = this.preds.get(relation);
		if (pred == null) {
			pred = "unknown";
		}
		return pred;
	}
}
