---
title: "SolutionExporter"
id: "solutionexporter"
---

API Name: global.SolutionExporter

```js
var SolutionExporter = Class.create();
SolutionExporter.prototype = {
    initialize: function() {
		this.tracker = SNC.GlideExecutionTracker.getLastRunning();
    },
	
	exportSolutionDefinition:function (capabilityDefiniton) {
		this.tracker.setMaxProgressValue(this.getTotalRowCount(capabilityDefiniton.getUniqueValue()));
		this.tracker.run();
		
		if (capabilityDefiniton == null || !capabilityDefiniton.isValidRecord()) {
			this.tracker.fail(gs.getMessage('Invalid solution definition'));
			return;
		}
		try {
			var updateManager = new GlideUpdateManager2();
			this.saveRecord(capabilityDefiniton, updateManager);

			var solutions = this.getRelatedRecords('ml_solution', 'ml_capability_definition', capabilityDefiniton.getUniqueValue());
			while (solutions.next()) {
				this.tracker.updateMessage(gs.getMessage('Adding records for solution {0} version {1}', [solutions.solution_name, solutions.version]));
				solutions.setValue('progress_tracker', '');
				solutions.update();
				this.saveRecord(solutions, updateManager);
				this.addRelatedRecords('ml_pc_lookup', 'solution', solutions.getUniqueValue(), updateManager);
				this.addRelatedRecords('ml_class', 'solution', solutions.getUniqueValue(), updateManager);
				this.addRelatedRecords('ml_model_artifact', 'solution', solutions.getUniqueValue(), updateManager);
				this.addRelatedRecords('ml_excluded_classes', 'solution', solutions.getUniqueValue(), updateManager);
				
				var wvCorpus = solutions.getValue('word_vector_corpus');
				this.addRelatedRecords('ml_word_vector_corpus', 'sys_id', wvCorpus, updateManager);
				this.addRelatedRecords('ml_word_vector_corpus_details', 'word_vector_corpus', wvCorpus, updateManager);
				
				var wvCorpusVersion = solutions.getValue('wvc_version');
				this.addRelatedRecords('ml_word_vector_corpus_versions', 'sys_id', wvCorpusVersion,  updateManager);
				
				var wvCorpusVersionGr = new GlideRecord('ml_word_vector_corpus_versions');
				wvCorpusVersionGr.addQuery('sys_id', wvCorpusVersion);
				wvCorpusVersionGr.query();
				if (wvCorpusVersionGr.next()) {
					var wvCorpusModelArtifact = wvCorpusVersionGr.getValue('model_artifact');
					this.addRelatedRecords('ml_model_artifact', 'sys_id', wvCorpusModelArtifact, updateManager);
				}
								
			}
			
			var gr1 = new GlideRecord('sysauto');
			gr1.addQuery('name', capabilityDefiniton.getUniqueValue());
			gr1.addQuery('run_type', 'periodically');
			gr1.query();
			if (gr1.next()) {
				this.saveRecord(gr1, updateManager);
			}
			
			this.tracker.success();
		} catch (error) {
			this.tracker.fail(error.message);
		}
	},
	
	getTotalRowCount:function (capabilityDefinitonId) {
		// Count ml_solution_definition record
		var count = 1;
		var solutions = this.getRelatedRecords('ml_solution', 'solution_definition', capabilityDefinitonId);
		while (solutions.next()) {
			// Count ml_solution record
			count++;
			// Add all solution related records (ml_class, ml_pc_lookup, ml_model_artifact)
			count += this.getRelatedRecords('ml_pc_lookup', 'solution', solutions.getUniqueValue()).getRowCount();
			count += this.getRelatedRecords('ml_class', 'solution', solutions.getUniqueValue()).getRowCount();
			count += this.getRelatedRecords('ml_model_artifact', 'solution', solutions.getUniqueValue()).getRowCount();
		}
		return count;
	},
	
	getRelatedRecords:function (tableName, referenceField, id) {
		var gr = new GlideRecord(tableName);
		gr.addQuery(referenceField, id);
		gr.query();
		return gr;
	},
	
	addRelatedRecords:function (tableName, referenceField, id, updateManager) {
		var gr = this.getRelatedRecords(tableName, referenceField, id);
		while (gr.next()) {
			this.saveRecord(gr, updateManager);
		}
	},
	
	saveRecord:function (gr, updateManager) {
		this.tracker.incrementProgressValue(1);
		var savedCorrectly = updateManager.saveRecord(gr);
		if (!savedCorrectly) {
			var errorMessage = gs.getMessage('Error while saving record {0}_{1}', [gr.getTableName(), gr.getUniqueValue()]);
			throw {message: errorMessage};
		}
	},

    type: 'SolutionExporter'
};
```