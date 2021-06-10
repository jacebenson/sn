---
title: "sc_ic_QuestionType"
id: "sc_ic_questiontype"
---

API Name: global.sc_ic_QuestionType

```js
var sc_ic_QuestionType = Class.create();
sc_ic_QuestionType.prototype = Object.extendsObject(sc_ic_Base,{
    initialize: function(_gr,_gs) {
		sc_ic_Base.prototype.initialize.call(this,_gr,_gs);
    },

	checkForPreconfigured: function() {
		var questionTypeGr = new GlideRecord(sc_ic.QUESTION_TYPE);
		questionTypeGr.addActiveQuery();
		questionTypeGr.addQuery(sc_ic.PRECONFIGURED, false);
		questionTypeGr.addQuery("sys_id", "!=", this._gr.getUniqueValue());
		questionTypeGr.addQuery(sc_ic.QUESTION_CLASS, this._gr[sc_ic.QUESTION_CLASS]+"");
		questionTypeGr.query();
		
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[checkForPreconfigured] Found " + questionTypeGr.getRowCount() + " existing preconfigured questions");
		
		return questionTypeGr;
	},
	
    type: 'sc_ic_QuestionType'
});

sc_ic_QuestionType.getTypesByClass = function(source) {
	var refQual = "sys_idIN0";

	var questionTypeGr = new GlideRecord(sc_ic.QUESTION_TYPE);
	questionTypeGr.addActiveQuery();
	if (JSUtil.notNil(source[sc_ic.QUESTION_CLASS]))
		questionTypeGr.addQuery(sc_ic.QUESTION_CLASS + ".sys_id", source[sc_ic.QUESTION_CLASS]+"");
	questionTypeGr.orderBy(sc_ic.PRECONFIGURED);
	questionTypeGr.query();

	while (questionTypeGr.next())
		refQual += "," + questionTypeGr.getValue("sys_id");

	return refQual;
};

```