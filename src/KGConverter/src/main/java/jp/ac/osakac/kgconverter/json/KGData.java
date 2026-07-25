package jp.ac.osakac.kgconverter.json;

import java.util.List;

public class KGData {
	public String getSubject() {
		return subject;
	}
	public void setSubject(String subject) {
		this.subject = subject;
	}
	public String getIppan_s() {
		return ippan_s;
	}
	public void setIppan_s(String ippan_s) {
		this.ippan_s = ippan_s;
	}
	public String getRelation() {
		return relation;
	}
	public void setRelation(String relation) {
		this.relation = relation;
	}
	public String getObject() {
		return object;
	}
	public void setObject(String object) {
		this.object = object;
	}
	public String getIppan_o() {
		return ippan_o;
	}
	public void setIppan_o(String ippan_o) {
		this.ippan_o = ippan_o;
	}
	public List<Opinion> getOpinion() {
		return opinion;
	}
	public void setOpinion(List<Opinion> opinion) {
		this.opinion = opinion;
	}
	public String getTxt_contents() {
		return txt_contents;
	}
	public void setTxt_contents(String tcxt_contents) {
		this.txt_contents = tcxt_contents;
	}
	private String subject;
	private String ippan_s;
	private String relation;
	private String object;
	private String ippan_o;
	private List<Opinion> opinion;
	private String txt_contents;
}

