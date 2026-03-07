package com.demo.ecommerce.dto;

import java.util.List;
import java.util.Map;

public class ChatResponse {
    private String answer;
    private boolean refused;
    private String sqlQuery;
    private Map<String, Object> data;
    private String visualizationHtml;

    public ChatResponse() {}

    public ChatResponse(String answer, boolean refused) {
        this.answer = answer;
        this.refused = refused;
    }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }
    public boolean isRefused() { return refused; }
    public void setRefused(boolean refused) { this.refused = refused; }
    public String getSqlQuery() { return sqlQuery; }
    public void setSqlQuery(String sqlQuery) { this.sqlQuery = sqlQuery; }
    public Map<String, Object> getData() { return data; }
    public void setData(Map<String, Object> data) { this.data = data; }
    public String getVisualizationHtml() { return visualizationHtml; }
    public void setVisualizationHtml(String visualizationHtml) { this.visualizationHtml = visualizationHtml; }
}
