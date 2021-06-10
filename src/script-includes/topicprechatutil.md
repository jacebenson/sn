---
title: "TopicPreChatUtil"
id: "topicprechatutil"
---

API Name: global.TopicPreChatUtil

```js
var TopicPreChatUtil = Class.create();
TopicPreChatUtil.prototype = {
    initialize: function() {
    },
	
	/** Retrieves question data from an assessment instance for use in topics
	  * @param String sys_id The sys_id of the assessment_instance
	  * @return Array questionData An array of question data from the instance
	  */
	getQuestionData: function(sys_id) {
		var gr = new GlideRecord('asmt_assessment_instance_question');
		gr.addQuery('instance', sys_id);
		gr.query();
		var questionData = [];
		while (gr.next()){
			questionData[gr.getValue('metric')] = {
				instanceID: gr.getUniqueValue() + '',
				contextVar: gr.metric.context.script_variable + '',
				type: gr.metric.datatype + '',
				name: gr.metric.name + '',
			};
		}
		return questionData;
	},

    type: 'TopicPreChatUtil'
};
```