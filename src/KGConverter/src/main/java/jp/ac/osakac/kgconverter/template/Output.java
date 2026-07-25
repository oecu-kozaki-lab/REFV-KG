package jp.ac.osakac.kgconverter.template;

public class Output implements YamlTemplate{
	private GraphData graph;
	private FileData file;
	/**
	 * @return graph
	 */
	public GraphData getGraph() {
		return graph;
	}
	/**
	 * @param graph セットする graph
	 */
	public void setGraph(GraphData graph) {
		this.graph = graph;
	}
	/**
	 * @return file
	 */
	public FileData getFile() {
		return file;
	}
	/**
	 * @param file セットする file
	 */
	public void setFile(FileData file) {
		this.file = file;
	}
}
