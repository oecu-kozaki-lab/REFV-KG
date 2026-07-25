package jp.ac.osakac.kgconverter.json;

public class Opinion {
	public String getSpeaker() {
		return speaker;
	}
	public void setSpeaker(String speaker) {
		this.speaker = speaker;
	}
	public String getContent() {
		return content;
	}
	public void setContent(String content) {
		this.content = content;
	}
	public String getIppan_st() {
		return ippan_st;
	}
	public void setIppan_st(String ippan_st) {
		this.ippan_st = ippan_st;
	}
	private String speaker;
	private String content;
	private String ippan_st;
	
}
