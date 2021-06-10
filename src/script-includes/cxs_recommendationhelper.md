---
title: "cxs_RecommendationHelper"
id: "cxs_recommendationhelper"
---

API Name: global.cxs_RecommendationHelper

```js
var cxs_RecommendationHelper = Class.create();
cxs_RecommendationHelper.prototype = Object.extendsObject(cxs_BaseMLHelper, {
    DEFAULT_TOTAL_COUNT: '1000',
    DEFAULT_THRESHOLD: 1,
	RECOMMENDATION_COUNT: 1,
	RECOMMENDATION_TITLE: 'recommendationTitle',
	RECOMMENDATION_MESSAGE: 'recommendationMessage',
    RECOMMENDATION_TYPE: 'recommendationType',
    RECOMMENDATION_ACTION: 'recommendationAction',
    processSearch: function () {
        //gs.log('******* inputs' + arguments[0]);
        var inputs = JSON.parse(arguments[0]); 
		
		//Initialize 
        if (!inputs['tableName'] || !inputs['solutionDefinition'])
            return;
		
        this.threshold = this.DEFAULT_THRESHOLD;
		this.solutionName = this.getSolutionName(inputs['solutionDefinition'].toString());
        this.tableName = inputs['tableName'].toString();
		this.recommendationMessage = inputs['RecommendationMessage'];
		this.recommendationTitle = inputs['RecommendationTitle'];
		this.detectionTitle= inputs['DetectionTitle'];
		this.detectionQuery= inputs['DetectionQuery'].toString();
		this.proposeActionSysId = inputs['proposeActionSysId'].toString();
        
        //gs.log('******* this.threshold' + this.threshold + this.tableName + this.count + this.request.formId + this.request.formTable + this.request.uiType + this.solutionName);
        
        //Cannot do ML search if there are no form details
        if (!this.request.formId || !this.request.formTable)
            return;
        
        var formGr = this.getFormGr();

        //Invalid form details
        if (!formGr)
            formGr = new GlideRecord(this.request.formTable);

		//Incident table - No recommendations needed for the form that has a parent incident
		if (this.request.formTable === 'incident' && !formGr.parent_incident.nil())
			return;
		
		//Call ML serivce
		var MLResults = this.callRecommendationService(formGr);

		//Return if no results
		if (!MLResults || MLResults.length <= 0) 
			return; 

		//Process results from ML predictions
		this.processResults(MLResults, formGr);

        //gs.log('********* response *********' + JSON.stringify(this.response));
    },
    
    getFormGr: function () {
        var gr = new GlideRecord(this.request.formTable);
        if (gr.get(this.request.formId)) {
            return gr;
        }
        return null;
    },
    
    callRecommendationService: function (formGr) {
        var predictor = new MLPredictor();
        var info = "";
        var solution = predictor.findActiveSolution(this.solutionName);
        if (!solution) 
            return;
        var outcomeArray = predictor.getPredictions(formGr, solution); //Threshold is default which is 1
        return outcomeArray;
    },
    
    processResults: function (results, formGr) {
		var formatedResults = this.formatResults(results);
		var sysIdsInOrder = formatedResults.sysIdsInOrder;
		if (sysIdsInOrder && sysIdsInOrder.length > 0) 
			this.assimilateResults(sysIdsInOrder, formatedResults.resultsJson, formGr);
    },
        
    formatResults: function (results) {
		var resultsJson = {};
		var sysIdsInOrder = [];
		if (results) {
			for (var i=0; i< results.length; i++) {
				if (results[i].hasPrediction()){
                    var predictionObj = {};
					var sysId = results[i].predictedValue().length === 32 ? results[i].predictedValue(): results[i].predictedValueSysId();
                    predictionObj['predictedValue'] = results[i].predictedValue(); 
                    predictionObj['predictedValueSysId'] = sysId; //sys_id for similarity
                    predictionObj['confidence'] = results[i].confidence(); //similarity score
                    resultsJson[sysId] = predictionObj;
					sysIdsInOrder.push(sysId);
				} 
			}
		}
        return {'sysIdsInOrder': sysIdsInOrder, 'resultsJson': resultsJson};
    },
    
    updateSearchText: function (formGr) {
		var searchText = this.getSearchText();

		if (searchText) {
			var fieldGr = this.getTableConfigDefaultField();
			var currentSearchField = this.getCurrentSearchField();
			//gs.log('******* fieldGr.field' + fieldGr.field);
			//gs.log('******* currentSearchField' + currentSearchField + formGr.isValidField(currentSearchField));
			if (currentSearchField && formGr.isValidField(currentSearchField))
				formGr.setValue(currentSearchField, searchText);
			else if (fieldGr && fieldGr.field && formGr.isValidField(fieldGr.field))
				formGr.setValue(fieldGr.field, searchText);
		}
		return formGr;
	},
	
	getSearchText: function () {
		return this.request.query && this.request.query.freetext ? this.request.query.freetext : null;
	},
	
	getTableConfigDefaultField: function () {
		var tableConfig = this.getTableConfig();
		if (tableConfig) {
			return this.getDefaultField(tableConfig.sys_id);
		}
		return '';
	},
	
	getCurrentSearchField: function () {
		return this.request.meta && this.request.meta['sourceField'];
	},
	
    getMajorGr: function (sysIdsInorder) {
        var gr = new GlideRecordSecure(this.tableName);
        gr.addQuery('sys_id', 'IN', sysIdsInorder.join());
		gr.addEncodedQuery(this.detectionQuery);//eg: 'major_incident_state=accepted^ORparent_incident.major_incident_state=accepted');
        gr.query();

		if (gr.getRowCount() === 0) 
			return gr;
		else if (gr.getRowCount() === 1) {
			gr.next();
			return gr;
		}
		else {
			// More than 1 major incidents are found. So, find the one that has maximum confidence
			var majorSysIds = {};
			
			while (gr.next()) {
				majorSysIds[gr.getUniqueValue()] = 1; //Obj makes search faster which is done later in the code
			}

			for (var i = 0;  i < sysIdsInorder.length; i++) {

				if (majorSysIds[sysIdsInorder[i]]) {

					var resultsGr = new GlideRecord(this.tableName);
			        resultsGr.get(sysIdsInorder[i].toString());
					return resultsGr;
				}
			}
		}
    },
	
	getSimilarGr: function (sysIds) {
        var gr = new GlideRecordSecure(this.tableName);
        gr.addQuery('sys_id', 'IN', sysIds);
		gr.orderBy('sys_created_on');
        gr.query();
        return gr;
    },
    
    assimilateResults: function (sysIds, formatedResults, formGr) {
		//Remove self if it is present in the ML results
		var found = sysIds.indexOf(this.request.formId);
		//gs.log('****** self found '+ found);

		if (found !== -1) {
			sysIds.splice(found,1);
		}
		// Get records that are readable by the user
		var resultsGr = this.getMajorGr(sysIds);
		var res = new SNC.SearchResult();
		var uiType = this.request.uiType;
		var basicInfo;
		var addFieldGr;

        if(resultsGr.isValidRecord()) {
            addFieldGr = this.getAddResourcesFieldsGr(uiType);
            
            //Basic details
            basicInfo = this.extractBasicInfo(addFieldGr, resultsGr);
            
            res.title = basicInfo[this.RESULT_TITLE];
            res.snippet = basicInfo[this.RESULT_TEXT];
            res.link = basicInfo[this.RESULT_LINK];
            res.id = basicInfo[this.ID];
            
            //Meta details
            var metaInfo = this.extractMetaInfo(addFieldGr, resultsGr, formatedResults[resultsGr.getUniqueValue()], uiType);

            res.meta[this.META_SCORE] = metaInfo[this.META_SCORE];
            res.meta[this.CONFIDENCE] = metaInfo[this.CONFIDENCE];
            res.meta[this.META_ADDITIONAL_FIELDS] = metaInfo[this.ADDITIONAL_FIELDS].toString();
			res.meta[this.RECOMMENDATION_TITLE] = this.detectionTitle ? this.detectionTitle: 'Major';
			res.meta[this.RECOMMENDATION_TYPE] = 'detection';
			this.response.results.push(res);
        } else {
			if (this.request.formTable === 'incident' && !(new sn_major_inc_mgmt.MajorIncidentTriggerRules(formGr)).canProposeMIC())
				return;
			var similarGr = this.getSimilarGr(sysIds);
			if (similarGr.next()) {
				addFieldGr = this.getAddResourcesFieldsGr(uiType);
				
				//Basic details
				basicInfo = this.extractBasicInfo(addFieldGr, similarGr);
				
				res.title = basicInfo[this.RESULT_TITLE];
				res.snippet = basicInfo[this.RESULT_TEXT];
				res.link = basicInfo[this.RESULT_LINK];
				res.id = basicInfo[this.ID] + 'REC';
				res.meta[this.RECOMMENDATION_TITLE] = this.recommendationTitle ? this.recommendationTitle : 'Recommendation';
				res.meta[this.RECOMMENDATION_TYPE] = 'recommendation';
				res.meta[this.RECOMMENDATION_MESSAGE] = this.getRecommendationDetails(similarGr);
				res.meta[this.RECOMMENDATION_ACTION] = this.proposeActionSysId;
				this.response.results.push(res);
			}
		}
    },
	
	getRecommendationDetails: function(similarGr) {
		var similarCount = similarGr.getRowCount();
		var since = Math.floor(Math.abs(new GlideDateTime(String(similarGr.getValue('sys_created_on'))).getNumericValue() - new GlideDateTime().getNumericValue())/ (1000 * 3600));
		return gs.getMessage(this.recommendationMessage, [similarCount, since.toString()]);
	},
   
    type: 'cxs_RecommendationHelper'
});
```