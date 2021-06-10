---
title: "SurveyUtilAjax"
id: "surveyutilajax"
---

API Name: global.SurveyUtilAjax

```js
var SurveyUtilAjax = Class.create();
SurveyUtilAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	isPublic: function(){
		return true;
	},

	validateMultipleStringFieldsAjax: function() {
		return this.validateMultipleStringFields(this.getParameter('stringQAnswerChangeMap'));
	},

	// stringQAnswerMap: {key:field id or name, {value: field value, validator: field validator})
	validateMultipleStringFields: function(stringQAnswerMap) {
		stringQAnswerMap = JSON.parse(stringQAnswerMap);
		if (!stringQAnswerMap)
            return "";

		// build validator array
		var validators = [];
		Object.keys(stringQAnswerMap).forEach(function(key) {
			var validator = stringQAnswerMap[key].validator;
			if (validator)
				validators.push(validator);
		});

		// build map of validator with funtion and error msg
		var validatorMap = {};
		var validatorGr = new GlideRecord("sys_cs_field_script_validator");
		if (!validatorGr.isValid())
			return "";
		validatorGr.addQuery("sys_id", "IN", validators.join());
		validatorGr.query();
		while (validatorGr.next())
			validatorMap[validatorGr.sys_id + ''] = {validateFunc:validatorGr.validator + '', error_message: validatorGr.error_message + ''};

		// eval values and build response JSON map
		var responseJSON = {};
		Object.keys(stringQAnswerMap).forEach(function(key) {
			var validatorId = stringQAnswerMap[key].validator;
			if (validatorId) {
				// DEF0108852: escape new lines introdued in multiline string
				var value = stringQAnswerMap[key].value.replace(/\r?\n/g, "\\n");
				var scriptBuild = "(" + validatorMap[validatorId].validateFunc + ")('"+ value + "');";
				var isValidAnswer = (value) ? eval(scriptBuild) : true;
				responseJSON[key] =  {
					value: value,
					isInvalidString: !isValidAnswer,
					fieldValidatorErrorMsg: isValidAnswer ? undefined : validatorMap[validatorId].error_message + ''
				};
			}
		});

		return JSON.stringify(responseJSON);
	},
	
    type: 'SurveyUtilAjax'
});
```