---
title: "SurveyCoreUtils"
id: "surveycoreutils"
---

API Name: global.SurveyCoreUtils

```js
var SurveyCoreUtils = Class.create();

SurveyCoreUtils.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	assessmentHasResult: function(metricTypeId) {
		var gr = new GlideRecord('asmt_metric_result');
		gr.addQuery('source_id', metricTypeId);
		gr.setLimit(1);
		gr.query();
		return gr.hasNext();
	},
	
	metricHasResult: function(metricId) {
		var metricResults = new GlideRecordSecure('asmt_metric_result');
		return metricResults.get('metric', metricId);
	},
	
	assessmentsWithResult: function() {
		var gr = new GlideRecord('asmt_metric_type');
		var list = '';
		gr.addJoinQuery('asmt_metric_result', 'sys_id', 'source_id');
		gr.query();
		while (gr.next())
			list += gr.sys_id + ',';
		return list;
	},

	isSurvey: function(metricTypeId) {
		var gr = new GlideRecord('asmt_metric_type');
		if (!gr.get(metricTypeId))
			return false;

		return gr.evaluation_method == 'survey';
	},

	isQuiz: function(metricTypeId) {
		var gr = new GlideRecord('asmt_metric_type');
		if (!gr.get(metricTypeId))
			return false;

		return gr.evaluation_method == 'quiz';
	},

	isTestPlan: function(metricTypeId) {
		var gr = new GlideRecord('asmt_metric_type');
		if (!gr.get(metricTypeId))
			return false;

		return gr.evaluation_method == 'testplan';
	},

	isAttest: function(metricTypeId) {
		var gr = new GlideRecord('asmt_metric_type');
		if (!gr.get(metricTypeId))
			return false;

		return gr.evaluation_method == 'attestation';
	},

	isAsmt: function(metricTypeId) {
		var gr = new GlideRecord('asmt_metric_type');
		if (!gr.get(metricTypeId))
			return false;

		return gr.evaluation_method == 'assessment';
	},

	surveyIsPublic: function(metricTypeId){
		var gr = new GlideRecord('asmt_metric_type');
		if (!gr.get(metricTypeId))
			return false;

		return gr.allow_public;
	},

	getTriggerConditionMetricType:function() {
		var mt = [];
		var metricType = new GlideRecord('asmt_metric_type');
		metricType.addActiveQuery();
		metricType.query();
		while(metricType.next()) {
			if(metricType.evaluation_method != 'survey' || metricType.schedule_period == 0){
				mt.push(metricType.getValue('sys_id'));
			}
		}
		return 'sys_idIN' + mt.join(',');
	},

    setPublicAccess: function(surveyId, isPublic) {
        var survey = new GlideRecord('asmt_metric_type');
        if (!survey.get(surveyId) || survey.evaluation_method != 'survey')
            return false;
        var roleArr = [];
        if (isPublic) {
            // enable public access
            if (this._hasAttachmentMetric(survey.sys_id)) {
                gs.addErrorMessage(gs.getMessage("Survey with the attachment question can't be made public"));
                return false;
            }
            if (survey.signature) {
                gs.addErrorMessage(gs.getMessage("To make a survey public, you need to remove the signature"));
                return false;
            }
            var pages = new Array("assessment_take2", "assessment_thanks");
            for (var i in pages) {
                var page = pages[i];
                var gr = new GlideRecord("sys_public");
                gr.get("page", page);
                if (!gr.isValidRecord()) {
                    gr.page = page;
                    gr.insert();
                    gs.print("Added public page '" + page + "'");
                }
            }

            var img = new GlideRecord("sys_security_restricted_list");
            img.addActiveQuery();
            img.addQuery("list_context", "image_restricted_table_pattern");
            img.addQuery("list_type", "whitelist");
            img.addQuery("value", "ZZ_YYasmt_metric_definition");
            img.query();
            if (!img.next()) {
                img.initialize();
                img.setValue("active", "true");
                img.setValue("list_context", "image_restricted_table_pattern");
                img.setValue("list_type", "whitelist");
                img.setValue("value", "ZZ_YYasmt_metric_definition");
                img.insert();
            }

            //Same for template definition
            img = new GlideRecord("sys_security_restricted_list");
            img.addActiveQuery();
            img.addQuery("list_context", "image_restricted_table_pattern");
            img.addQuery("list_type", "whitelist");
            img.addQuery("value", "ZZ_YYasmt_template_definition");
            img.query();
            if (!img.next()) {
                img.initialize();
                img.setValue("active", "true");
                img.setValue("list_context", "image_restricted_table_pattern");
                img.setValue("list_type", "whitelist");
                img.setValue("value", "ZZ_YYasmt_template_definition");
                img.insert();
            }

            //PRB1370243: Same for NPS template definition
            img = new GlideRecord("sys_security_restricted_list");
            img.addActiveQuery();
            img.addQuery("list_context", "image_restricted_table_pattern");
            img.addQuery("list_type", "whitelist");
            img.addQuery("value", "ZZ_YYasmt_nps_definition");
            img.query();
            if (!img.next()) {
                img.initialize();
                img.setValue("active", "true");
                img.setValue("list_context", "image_restricted_table_pattern");
                img.setValue("list_type", "whitelist");
                img.setValue("value", "ZZ_YYasmt_nps_definition");
                img.insert();
            }

            survey.allow_public = true;
            var updateRoles = true;
            roleArr = survey.getValue("roles").split(",");
            for (var role in roleArr) {
                if (role == 'public') {
                    updateRoles = false;
                    break;
                }
            }
            if (updateRoles) {
                roleArr.push("public");
                survey.roles.setValue(roleArr.join(","));
            }
            survey.update();
            gs.addInfoMessage(gs.getMessage("Survey: <b>{0}</b> is now publicly available to users that are not logged in", GlideStringUtil.escapeHTML(survey.getDisplayValue())));

        } else {
            // remove public access
            survey.allow_public = false;
            roleArr = survey.getValue("roles").split(",");
            for (var j = 0; j < roleArr.length; j++) {
                if (roleArr[j] == "public") {
                    roleArr.splice(j, 1);
                    break;
                }
            }
            survey.setValue("roles", roleArr.join(","));
            survey.update();
            gs.addInfoMessage(gs.getMessage("Survey: <b>{0}</b> is no longer publicly available to users that are not logged in", GlideStringUtil.escapeHTML(survey.getDisplayValue())));
        }
    },

    _hasAttachmentMetric: function(metricTypeId) {
        var gr = new GlideRecord('asmt_metric');
        gr.addQuery('metric_type', metricTypeId);
        gr.query();
        while (gr.next()) {
            if (gr.datatype.toString() == 'attachment')
                return true;
        }
        return false;
    },
			
	calculateNPS: function(questionId) {		
		var count = 0, promoters = 0, passives = 0, detractors = 0, totalCount = 0, npsPercent = 0;

		// query to check if user can read question results according to ACL permissions
		var resultCanRead = false;
		var mResultGR = new GlideRecordSecure('asmt_metric_result');
		mResultGR.addQuery('metric', questionId);
		mResultGR.setLimit(1);
		mResultGR.query();
		if (mResultGR.next()) 
			resultCanRead = true;
		
		var mResult = new GlideAggregate('asmt_metric_result');
		mResult.addQuery('metric', questionId);
		mResult.addAggregate('COUNT', 'nps_value');
		mResult.groupBy('nps_value');
		mResult.query();
		while (mResult.next() && resultCanRead) {
			count = mResult.getAggregate('COUNT', 'nps_value');
			if (mResult.nps_value == 1)
				promoters += Number(count);
			else if (mResult.nps_value == 0)
				passives += Number(count);
			else if (mResult.nps_value == -1)
				detractors += Number(count);
			else
				continue;
			totalCount += Number(count);
		}

		if (totalCount > 0)
			npsPercent = ((promoters - detractors) / totalCount) * 100;
		return npsPercent;
	},
				
	getCategoryCharts: function(assessable, source) {
		var iFrameCharts = [];
		var cat = [];
		var catObjs = [];
		var catNames = [];
		var gr = new GlideAggregate("asmt_category_result");
		gr.addQuery("metric_type", assessable.metric_type.sys_id);
		gr.addQuery("source_id", source.sys_id);
		gr.orderBy("category.order");
		gr.orderBy("category.name");
		gr.groupBy("category");
		gr.query();
		var val = gr.getRowCount();
		var hasResults = (val > 0);
		while (gr.next()) {
			var catId = gr.category.sys_id.toString() + '';
			var catName = gr.category.name.toString();
			iFrameCharts.push('chart_' + catId);
			cat.push(catId);
			catNames.push(catName);
			catObjs.push({
				id: catId,
				name: catName
			});
		}
		return { 
			categories: cat, 
			categoryNames: catNames, 
			categoryObjects: catObjs, 
			iFrameCharts: iFrameCharts,
			hasResults: hasResults
		};
	},
	
	getAttachmentTable: function(questionId) {
		var name = 'asmt_assessment_instance_question';
		var gr = new GlideRecord('asmt_assessment_instance_question');
		gr.addQuery('sys_id', questionId);
		gr.query();
		if (gr.next())
			if (gr.instance.state.toString() == 'complete')
				name = 'asmt_metric_result';
		
		return { name: name, question: gr };
	},
		
	getAttachmentQuery: function() {
		var metricId = this.getParameter('sysparm_metricId');
		var metricResults = [];
		var attachQuery ='';
		var metric_result = new GlideRecordSecure('asmt_metric_result');
		metric_result.addQuery('metric', metricId);
		metric_result.query();
		while (metric_result.next())
			metricResults.push(String(metric_result.sys_id));
		
		for(var j=0; j < metricResults.length; j++) {
			attachQuery += 'table_sys_id%3D'+metricResults[j];
			if (j != metricResults.length-1)
				attachQuery += '^OR';
		}
		return attachQuery;
	},
	
	getMetricResultId: function(instanceId, questionId) {
		var result = new GlideRecord('asmt_metric_result');
		result.addQuery('instance', instanceId);
		result.addQuery('instance_question', questionId);
		result.query();
		if (result.next()) {	
			var sys_id = result.sys_id.toString();
			return sys_id;
		}
	},

	type: 'SurveyCoreUtils'
});
```