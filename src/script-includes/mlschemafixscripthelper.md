---
title: "MLSchemaFixScriptHelper"
id: "mlschemafixscripthelper"
---

API Name: global.MLSchemaFixScriptHelper

```js
var MLSchemaFixScriptHelper = Class.create();
MLSchemaFixScriptHelper.prototype = {
    initialize: function() {
		this.prev_sol_def_map = {};
		this.new_sol_def_map = {};
		this.mapPrevandNewSolutionDef();
    },
	/*
	* Helper funct to move solution definition from ml_solution_definition table to new schema
	* input - solutionsArr ( Array of Solution Names)
	*       - type (include / exclude)
	*
	*/
	fixMLSchemaforOrlandoUpgrade: function(solutionsArr, type){
		gs.info('MLinfo - Started moving solution definition to new schema');
		var similarity_capability = "15ab7f3c53873300d1dcddeeff7b12ce";
		var clustering_capability = "366d333453c73300d1dcddeeff7b12fc";
		var classification_capability = "95ca97b453873300d1dcddeeff7b120f";
		var nlu_capability = "b4ddf73453c73300d1dcddeeff7b1288";
		var eng_stopwords = "a6282a25533333008c5bddeeff7b12c3";
		var ml_def_gr = new GlideRecord('ml_solution_definition');
		if (type == "include" && !JSUtil.nil(solutionsArr) && solutionsArr.toString())
			ml_def_gr.addQuery('solution_name','IN',solutionsArr.toString());
		ml_def_gr.query();
		while (ml_def_gr.next()) {
			// do not run the fix script for nlu oob models as the updated ml_capability_definition_base records
			// are present in the update folders of respective plugins and need to be applied as part of that plugin
			// update. If this fix script runs before the plugin update, it creates a new ml_capability_definition_base
			// record which has a different sys_id than the one present in the plugin's update folder
			if (type == "exclude" && !JSUtil.nil(solutionsArr) && JSUtil.contains(solutionsArr, ml_def_gr.solution_name)) {
				gs.info('Ignore the Solution ' + ml_def_gr.solution_name);
				continue;
			}
			gs.info('Transfer the Solution ' + ml_def_gr.solution_name);
			var trainer = ml_def_gr.trainer.name + '';
			var new_ml_def_gr = '';
			
			//OOB solution definition should be updated if the customer has made changes to it.
			var is_solution_def_present = this.isSolutionDefinitionPresent(ml_def_gr.solution_name);
			var is_solution_def_cust_updated = this.isSolutionDefinitionCustomerUpdate(ml_def_gr.getUniqueValue());
			if (is_solution_def_present && !is_solution_def_cust_updated ){
				gs.info("solution definition "+ ml_def_gr.solution_name +" is present in new schema and it is not customer updated");
				continue;
			}
			switch(trainer) {
				case 'similarity_trainer':
					new_ml_def_gr = new GlideRecord('ml_capability_definition_similarity');
					if (is_solution_def_present) {
						new_ml_def_gr.addQuery('solution_name',ml_def_gr.solution_name);
						new_ml_def_gr.query();
						if (!new_ml_def_gr.next()) {
							new_ml_def_gr.initialize();
						}
					} else {
						new_ml_def_gr.initialize();
					}

					// Upgrading from madrid to orlando word vector for similarity is empty so create a new word vector and add to capability definition
					if (ml_def_gr.getValue('word_vector_corpus')) {
						new_ml_def_gr.setValue('word_vector_corpus',ml_def_gr.getValue('word_vector_corpus'));
					} else {
						var RecordInfo = {};
						RecordInfo.inputTableName = ml_def_gr.getValue('table');
						//gr.getValue(condition_field) returns null for empty condition field. gr.setValue(condition_field,null) doesnot work 
						//need to use gr.setValue(condition_field,"");
						RecordInfo.inputTableFilter = JSUtil.nil(ml_def_gr.getValue('input_filter')) ? "": ml_def_gr.getValue('input_filter');
						RecordInfo.inputFields = ml_def_gr.getValue('input_fields');
						RecordInfo.predictionInputFields = ml_def_gr.getValue('prediction_input_fields');
						RecordInfo.domain = ml_def_gr.getValue('sys_domain');
						RecordInfo.solution_name = ml_def_gr.getValue('solution_name');
						var wordVectorSysId = this.createWordVectorCorpus(RecordInfo);
						new_ml_def_gr.setValue('word_vector_corpus',wordVectorSysId);
					}
					if (ml_def_gr.getValue('table_to_compare')) {
						new_ml_def_gr.setValue('test_table', ml_def_gr.getValue('table_to_compare'));
						new_ml_def_gr.setValue('test_fields', ml_def_gr.getValue('fields_to_compare'));
					} else {
						new_ml_def_gr.setValue('test_table', ml_def_gr.getValue('table'));
						new_ml_def_gr.setValue('test_fields', ml_def_gr.getValue('prediction_input_fields'));
					}
					new_ml_def_gr.setValue('threshold', ml_def_gr.trainer.default_threshold);
					new_ml_def_gr.setValue('fields', ml_def_gr.getValue('prediction_input_fields'));
					var similarity_window_filter = JSUtil.nil(ml_def_gr.getValue('similarity_window_filter')) ? "": ml_def_gr.getValue('similarity_window_filter');
					new_ml_def_gr.setValue('filter', similarity_window_filter);
					new_ml_def_gr.setValue('update_frequency', ml_def_gr.getValue('update_frequency'));
					new_ml_def_gr.setValue('capability',similarity_capability);
					break;
				case 'classification_trainer':
					new_ml_def_gr = new GlideRecord('ml_capability_definition_classification');
					if (is_solution_def_present) {
						new_ml_def_gr.addQuery('solution_name',ml_def_gr.solution_name);
						new_ml_def_gr.query();
						if (!new_ml_def_gr.next()) {
							new_ml_def_gr.initialize();
						}
					} else {
						new_ml_def_gr.initialize();
					}
					new_ml_def_gr.setValue('output_field', ml_def_gr.getValue('output_field'));
					new_ml_def_gr.setValue('fields', ml_def_gr.getValue('input_fields'));
					var filter = JSUtil.nil(ml_def_gr.getValue('input_filter')) ? "": ml_def_gr.getValue('input_filter');
					new_ml_def_gr.setValue('filter', filter);
					new_ml_def_gr.setValue('capability',classification_capability);
					break;
				case 'clustering_trainer':
					new_ml_def_gr = new GlideRecord('ml_capability_definition_clustering');
					if (is_solution_def_present) {
						new_ml_def_gr.addQuery('solution_name',ml_def_gr.solution_name);
						new_ml_def_gr.query();
						if (!new_ml_def_gr.next()) {
							new_ml_def_gr.initialize();
						}
					} else {
						new_ml_def_gr.initialize();
					}
					new_ml_def_gr.setValue('word_vector_corpus',ml_def_gr.getValue('word_vector_corpus'));
					new_ml_def_gr.setValue('fields', ml_def_gr.getValue('prediction_input_fields'));
					var similarity_window_filter = JSUtil.nil(ml_def_gr.getValue('similarity_window_filter')) ? "": ml_def_gr.getValue('similarity_window_filter');
					new_ml_def_gr.setValue('filter', similarity_window_filter);
					new_ml_def_gr.setValue('update_frequency', ml_def_gr.getValue('update_frequency'));
					new_ml_def_gr.setValue('min_records', ml_def_gr.getValue('min_records'));
					if (ml_def_gr.getValue("use_segmentation") == 'true'){
						new_ml_def_gr.setValue('use_segmentation', ml_def_gr.getValue('use_segmentation'));
						new_ml_def_gr.setValue('segmentation_field', ml_def_gr.getValue('segmentation_field'));
					}
					new_ml_def_gr.setValue('capability',clustering_capability);
					break;
				case 'nlu_trainer':
					new_ml_def_gr = new GlideRecord('ml_capability_definition_base');
					if (is_solution_def_present) {
						new_ml_def_gr.addQuery('solution_name',ml_def_gr.solution_name);
						new_ml_def_gr.query();
						if (!new_ml_def_gr.next()) {
							new_ml_def_gr.initialize();
						}
					} else {
						new_ml_def_gr.initialize();
					}
					new_ml_def_gr.setValue('capability',nlu_capability);
					break;
			}
			var new_ml_def_gr_sys_id = "";
			if(new_ml_def_gr){
				new_ml_def_gr.setValue('solution_label', ml_def_gr.getValue('solution_label'));
				new_ml_def_gr.setValue('solution_name', ml_def_gr.getValue('solution_name'));
				new_ml_def_gr.setValue('active', ml_def_gr.getValue('active'));
				new_ml_def_gr.setValue('sys_domain', ml_def_gr.getValue('sys_domain'));
				new_ml_def_gr.setValue('sys_scope', ml_def_gr.getValue('sys_scope'));
				new_ml_def_gr.setValue('table', ml_def_gr.getValue('table'));
				new_ml_def_gr.setValue('dataset_language', ml_def_gr.getValue('dataset_language'));
				new_ml_def_gr.setValue('training_frequency', ml_def_gr.getValue('training_frequency'));
				new_ml_def_gr.setValue('current_solution_version', ml_def_gr.getValue('current_solution_version'));
				new_ml_def_gr.setValue('stopwords',eng_stopwords);
				new_ml_def_gr.setWorkflow(false);
				
				if (is_solution_def_present) { 
					new_ml_def_gr_sys_id = new_ml_def_gr.update();	
				} else {
					new_ml_def_gr_sys_id = new_ml_def_gr.insert();
				}
				var checkgr = new GlideRecord('ml_capability_definition_base');
				checkgr.addQuery('solution_name',new_ml_def_gr.getValue("solution_name"));
				checkgr.query();
				if (checkgr.next() && (checkgr.getValue("sys_scope") != ml_def_gr.getValue('sys_scope'))){
					SNC.MLFixScriptUtil.updateCapabilitySolDefScope(new_ml_def_gr.getValue("solution_name"));
				}
				new_ml_def_gr.setWorkflow(true);
			}

			if (new_ml_def_gr_sys_id) {

				// connect all the solutions to new capability definition
				var solution_gr = new GlideRecord('ml_solution');
				solution_gr.addQuery('solution_definition', ml_def_gr.getUniqueValue());
				solution_gr.query();
				while ( solution_gr.next() ) {
					//table_to_compare and fields_to_compare will be empty for pre Newyork solutions
					//Adding values to use test solutions on pre newyork  traineds solutions
					if (trainer == 'similarity_trainer' && JSUtil.nil(solution_gr.getValue("table_to_compare"))){
						solution_gr.setValue('table_to_compare', solution_gr.getValue("table"));
					}
					if (trainer == 'similarity_trainer' && JSUtil.nil(solution_gr.getValue("fields_to_compare"))){
						solution_gr.setValue('fields_to_compare',solution_gr.getValue("prediction_input_fields"));
					}
					if (JSUtil.nil(solution_gr.getValue("capability"))){
						solution_gr.setValue('capability',trainer);
					}
					solution_gr.setValue('ml_capability_definition', new_ml_def_gr_sys_id);
					solution_gr.setWorkflow(false);
					solution_gr.update();
					solution_gr.setWorkflow(true);
				}
				// update advanced solution parameters for clustering solution
				if(trainer == 'clustering_trainer') {
					//target solution coverage, minimum number of records per cluster
					var clustering_params = ['999c201453733300d1dcddeeff7b1212'];
					for (var i=0; i< clustering_params.length; i++){
						var gr = new GlideRecord('ml_advanced_solution_settings');
						gr.initialize();
						gr.setValue('solution_parameters', clustering_params[i]);
						gr.setValue('ml_capability_definition', new_ml_def_gr_sys_id);
						gr.setValue('user_inputs',ml_def_gr.getValue('threshold'));
						gr.insert();
					}
				}
				//update all the training request schedule to new capability solution
				var training_schedule_gr = new GlideRecord('ml_training_request_schedule');
				training_schedule_gr.addQuery('solution_definition',ml_def_gr.getUniqueValue());
				training_schedule_gr.query();
				while (training_schedule_gr.next()){
					training_schedule_gr.setValue('ml_capability_definition', new_ml_def_gr_sys_id);
					training_schedule_gr.setWorkflow(false);
					training_schedule_gr.update();
					training_schedule_gr.setWorkflow(true);
				}

				//update all the update request schedule to new capability solution
				var update_schedule_gr = new GlideRecord('sysauto_script');
				update_schedule_gr.addQuery('name',ml_def_gr.getUniqueValue());
				update_schedule_gr.query();
				while (update_schedule_gr.next()){
					update_schedule_gr.setValue('name', new_ml_def_gr_sys_id);
					update_schedule_gr.setWorkflow(false);
					update_schedule_gr.update();
					update_schedule_gr.setWorkflow(true);
				}
			}
		}
	},
	createWordVectorCorpus: function(similarityRecordInfo){
		// Create a word vector corpus record
		var wordVecCorpusGR = new GlideRecord('ml_word_vector_corpus');
		wordVecCorpusGR.initialize();
		wordVecCorpusGR.setValue('name', similarityRecordInfo.solution_name);
		wordVecCorpusGR.setValue('active', true);
		wordVecCorpusGR.setValue('version', '1');
		wordVecCorpusGR.setValue('sys_domain', similarityRecordInfo.domain);
		var wordVecCorpusGRSysId = wordVecCorpusGR.insert();
		/*
		 * Create a word vector corpus details reocrd and add the word vector corpus record as
		 * a reference
		 */
		var wordVecCorpusDetailsGR = new GlideRecord('ml_word_vector_corpus_details');
		wordVecCorpusDetailsGR.initialize();
		wordVecCorpusDetailsGR.setValue('name', similarityRecordInfo.solution_name + '_' + similarityRecordInfo.inputTableName);
		wordVecCorpusDetailsGR.setValue('table', similarityRecordInfo.inputTableName);
		wordVecCorpusDetailsGR.setValue('filter', similarityRecordInfo.inputTableFilter);
		wordVecCorpusDetailsGR.setValue('field_list', similarityRecordInfo.inputFields);
		wordVecCorpusDetailsGR.setValue('sys_domain', similarityRecordInfo.domain);
		wordVecCorpusDetailsGR.setValue('word_vector_corpus',wordVecCorpusGRSysId);
		wordVecCorpusDetailsGR.insert();
		return wordVecCorpusGRSysId;
	},
	isSolutionDefinitionCustomerUpdate: function(solution_rec_id){
		var gr = new GlideRecord("sys_update_xml");
		gr.addQuery("name","ml_solution_definition_"+solution_rec_id);
		gr.query();
		if (gr.next()){
			return true;
		}
		return false;
	},
	isSolutionDefinitionPresent: function(solution_name){
		var gr = new GlideRecord("ml_capability_definition_base");
		gr.addQuery('solution_name',solution_name);
		gr.query();
		if(gr.next()){
			return true;
		}
		return false;
	},
	/*
	* input:
	*       Table - which has reference to ml_solution_definition
	*       previous column
	*       new column
	* usage - new MLSchemaFixScriptHelper().
	* migrateMLDefinitionReferences('ml_solution','solution_definition','ml_capability_definition'));
	*/
	migrateMLDefinitionReferences: function(table, previous_col, new_col){
		if (JSUtil.nil(table) || JSUtil.nil(previous_col) || JSUtil.nil(new_col)){
			return;
		}
		var gr = new GlideRecord(table);
		if (!gr.isValid()){
			return;
		}
		gs.info("Updating solution definition reference for table "+table);
		gr.query();
		while(gr.next()){
			var solution_name = this.prev_sol_def_map[ gr.getValue( previous_col )];
			var new_solution_sysid = this.new_sol_def_map[solution_name];
			if (new_solution_sysid && JSUtil.nil(gr.getValue(new_col))) {
				gr.setValue(new_col, new_solution_sysid);
				gr.update();
				gs.info("Updating reference for "+solution_name);
			}
		}
	},
	/*
		previous and new solution definition have same solution_name.
		Solution name is unique across all the solution definitions
	*/
	mapPrevandNewSolutionDef: function(){
		var prev_ml_def_gr = new GlideRecord('ml_solution_definition');
		prev_ml_def_gr.query();
		while (prev_ml_def_gr.next()){
			this.prev_sol_def_map[prev_ml_def_gr.getUniqueValue()] = prev_ml_def_gr.getValue('solution_name');
		}
		var new_ml_def_gr = new GlideRecord('ml_capability_definition_base');
		new_ml_def_gr.query();
		while (new_ml_def_gr.next()){
			this.new_sol_def_map[new_ml_def_gr.getValue('solution_name')] = new_ml_def_gr.getUniqueValue();
		}
	},
    type: 'MLSchemaFixScriptHelper'
};
```