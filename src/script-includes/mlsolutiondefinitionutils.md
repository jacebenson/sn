---
title: "MLSolutionDefinitionUtils"
id: "mlsolutiondefinitionutils"
---

API Name: global.MLSolutionDefinitionUtils

```js
var MLSolutionDefinitionUtils = Class.create();
MLSolutionDefinitionUtils.prototype = {
	ML_SOLUTION_DEFINITION_DEFAULT_COPY_ATTR_ARRAY: ['trainer','table','input_filter','dataset_language','input_fields','output_field','training_frequency','active','prediction_input_fields','lookup_window_size','similarity_window_filter','update_frequency','clustering_fields','clustering_window','clustering_window_filters','recluster_frequency','minimum_similarity_threshold','minimum_records_in_a_cluster','maximum_number_of_clusters','use_segmentation','segmentation_field','threshold','min_records','max_count','word_vector_corpus','table_to_compare','fields_to_compare'],
	ML_SOLUTION_DEFINITION: 'ml_solution_definition',
	ALWAYS_IGNORE_ATTRS_ARRAY: [],
	ML_CAPABILITY_SOL_DEFINITION_ATTR_ARRAY: ['table','filter','dataset_language','fields','output_field','training_frequency','active','update_frequency','capability','threshold','use_segmentation','segmentation_field','min_records','word_vector_corpus','test_table','test_fields','sys_domain','solution_parameters','stopwords','purity_fields'],
	ML_CAPABILITY_DEF_TABLES: [global.MLBaseConstants.ML_CAPABILITY_DEF_BASE,global.MLBaseConstants.ML_CAPABILITY_DEF_CLASSIFICATION,global.MLBaseConstants.ML_CAPABILITY_DEF_SIMILARITY,global.MLBaseConstants.ML_CAPABILITY_DEF_CLUSTERING, MLBaseConstants.ML_CAPABILITY_DEF_REGRESSION],
	USE_NEW_SCHEMA: gs.getProperty('glide.platform_ml.use_new_schema',false),
	
    initialize: function() {
		this.arrayUtil = new ArrayUtil();
		this.log = new GSLog('com.snc.ml.solution.definition.copy.log', 'MLSolutionDefinitionUtils');
		this.log.disableDatabaseLogs();
		this.similarity_capability = "15ab7f3c53873300d1dcddeeff7b12ce";
    },
	
	/**
 	* Process the list of copy attributes and get attribute values of current solution definition
 	* in the form of encoded query string
 	*/
	getMLSolutionDefinitionQueryParams: function(current){
		try{
			if(JSUtil.nil(current)){
				this.log.logErr('Invalid record passed');
				return false;
			}
			
			var attributesList = this._getAttributeList();
			
			if(!attributesList)
				return false;
			var validTable = current.getTableName() == this.ML_SOLUTION_DEFINITION;
			
			if (this.USE_NEW_SCHEMA == 'true') {
				var au = new ArrayUtil();
				validTable = au.contains(this.ML_CAPABILITY_DEF_TABLES, current.getTableName());
			}
			
			if (validTable && current.isValidRecord())
				return this._getRecordValuesAsEncodedQuery(current, attributesList);
			else
				this.log.logErr('Invalid record passed. A valid ml_solution_definition record is required');
			
		} catch(e){
			this.log.logErr('Exception caught: '+e);
		}
		
	},
	
	/**
	* _getAttributeList method 
	* 1. Gets list of attributes to be copied
	* 2. Removes extra white spaces, sanitizes the string values and constructs fieldList array - array of values (field names) to be copied
	* 3. Removes ALWAYS_IGNORE_ATTRS values from fieldList array and returns the resultant array
	*/
	
	_getAttributeList : function() {
		if(this.USE_NEW_SCHEMA == 'true') {
			return this.arrayUtil.diff(this.ML_CAPABILITY_SOL_DEFINITION_ATTR_ARRAY, this.ALWAYS_IGNORE_ATTRS_ARRAY);
		}
		return this.arrayUtil.diff(this.ML_SOLUTION_DEFINITION_DEFAULT_COPY_ATTR_ARRAY, this.ALWAYS_IGNORE_ATTRS_ARRAY);
	},
	
	/**
 	* Gets Solution Definition attributes in the form of encoded query string
 	*/
	
	_getRecordValuesAsEncodedQuery: function(/*GlideRecord object*/ record, /*Array*/ attributesList) {
		var table = record.getTableName();
		var gr = new GlideRecord(table);
		var activeAttrsToCopy = [];
		
		for (var i = 0; i < attributesList.length; ++i) {
			var name = attributesList[i];
			if (record.isValidField(name)) {
				if (record.getValue(name)){
					// We have to use the display value if it's a date based field for form filter
					if (record.getElement(name).getED().getInternalType() == "glide_date_time"){
						gr.addQuery(name, record.getDisplayValue(name));
					}
					else{
						gr.addQuery(name, record.getValue(name));
					}
				}
			}
			else
				this.log.logWarning("Invalid field '" + name + "' provided for table '" + table + "'.");
		}
		
		//Prefix 'Copy Of' to Label and Name of Current Solution Definition
		gr.addQuery('solution_label', 'Copy of '+record.getValue('solution_label'));
		gr.addQuery('solution_name', 'copy_of_'+record.getValue('solution_name'));
		return gr.getEncodedQuery();
		
	},
	
	getDefaultOOBSolutionDefinitions: function(trainer){
		var oobSolutionDefinitions = {};
		
		var gr = new GlideRecord("ml_autotrain_solution");
		if(trainer != 'all')
		gr.addQuery("solution_definition.capability", trainer);
		gr.query();
		while( gr.next()){
			var solution_definition = gr.solution_definition;
			var trainer1 = gr.solution_definition.capability;
			oobSolutionDefinitions[solution_definition] = {"plugin_id" : gr.plugin_id, "trainer": trainer1};
		}
		return oobSolutionDefinitions;
		
	},
	
	trainCapabilitySolDef: function(current){
		new MLRequestSchedule().deleteExistingCapabilityTrainingRequestSchedule(current.sys_id);
		new MLRequestSchedule().insertCapabilityTrainingRequestSchedule(current.sys_id, current.solution_label,current.training_frequency.toString());
	},
	
	/*
	* function to get the reference qualifier for the advanced solution setting table
	*/
	getSolutionParameter: function(current){
		return "capabilityLIKE"+current.ml_capability_definition.capability+"^active=true";
	},
	
	getStopwordLanguage: function(current){	
		return "language="+current.dataset_language;	
	},
	
	/**
	 * Conditions to be met for Word Corpus column reference qualifier
	 * on ml_capability_definition_base:
	 * 1. If ml_word_vector_corpus records are created via API,
	 * check if it is trained and has model artifacts
	 * 2. If ml_word_vector_corpus records' request_source is UI 
	 * OR request_source is empty (GloVe)
	 */
	getValidWordCorpusRecords: function(current) {
		var validAPIWordcorpusIds = [];
		var gr = new GlideRecord(MLBaseConstants.ML_MODEL_ARTIFACT);
		gr.addQuery('word_corpus.word_vector_corpus.request_source', 'api');
		gr.query();
		while (gr.next()) {
			var wvcVersion = new GlideRecord(MLBaseConstants.ML_WORD_VECTOR_CORPUS_VERSIONS);
			wvcVersion.get(gr.getValue('word_corpus'));
			validAPIWordcorpusIds.push(wvcVersion.getValue('word_vector_corpus'));
		}
		var wvcGR = new GlideRecord(MLBaseConstants.ML_WORD_VECTOR_CORPUS);
		var qc = wvcGR.addQuery('sys_id', 'IN', validAPIWordcorpusIds.join());
		qc.addOrCondition('request_source', 'ui');
		qc.addOrCondition('request_source', '');
		//Glove word corpus for paris can only be used for Similarity Capability.
		if (current.capability != this.similarity_capability) {
			var glove_wvc_sys_id = '7244d5a753220010d1dcddeeff7b12d5';
			wvcGR.addQuery('sys_id','!=',glove_wvc_sys_id);
		}
		wvcGR.query();
		return wvcGR.getEncodedQuery();
	},
	
    type: 'MLSolutionDefinitionUtils'
};
```