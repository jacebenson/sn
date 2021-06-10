---
title: "MlValidationHelper"
id: "mlvalidationhelper"
---

API Name: global.MlValidationHelper

```js
var MlValidationHelper = Class.create();
MlValidationHelper.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    initialize: function() {
        this.MLBaseConstants = global.MLBaseConstants;
		this.LD = "668619e753220010d1dcddeeff7b125a";
		this.minimum_neighbor = "32ddecd053733300d1dcddeeff7b12c2";
    },
    //validates input fields, minimum and maximum number of records for training.
    minmaxValidation: function(table, filter, capability) {
        var validation = true;
        var minNumber = 10000;
        var maxNumber = 300000;
        var errorMsg = "";

        var gr = new GlideRecordSecure(table);
        gr.addEncodedQuery(filter);
        gr.query();
        var inputSize = gr.getRowCount();


        var trainerName = "";
        switch (capability) {
            case "similarity_trainer":
                minNumber = gs.getProperty('glide.platform_ml.api.min_similarity_window_records', 10);
                maxNumber = gs.getProperty('glide.platform_ml.api.max_similarity_window_records', 100000);
                trainerName = gs.getMessage('Similarity');
                break;
            case "clustering_trainer":
                minNumber = gs.getProperty('glide.platform_ml.api.min_clustering_records', 100);
                maxNumber = gs.getProperty('glide.platform_ml.api.max_clustering_records', 100000);
                trainerName = gs.getMessage('Clustering');
                break;
            case "classification_trainer":
                minNumber = gs.getProperty('glide.platform_ml.api.csv_min_line', 10000);
                maxNumber = gs.getProperty('glide.platform_ml.api.csv_max_line', 300000);
                trainerName = gs.getMessage('Classification');
                break;
            case "regression_trainer":
                minNumber = gs.getProperty('glide.platform_ml.api.min_regression_records', 10000);
                maxNumber = gs.getProperty('glide.platform_ml.api.max_regression_records', 300000);
                trainerName = gs.getMessage('Regression');
                break;
            default:
        }


        if (minNumber <= 0) {
            minNumber = 1;
        }
        if (inputSize < minNumber) {
            errorMsg += gs.getMessage("Solution training requires a minimum number of {0} records. ", minNumber.toString());
            validation = false;
        }
        //DEF0096884 : If inputSize is more than max row count, training should happen with latest 'maxNumber' records.
        //if (inputSize > maxNumber) {
        //    errorMsg = gs.getMessage("Select a maximum of {0} records in Step 3 for {1} training. Train the solution after you update the filters in step 3. ", [maxNumber.toString(), trainerName]);
        //    validation = false;
        //}

        return {
            'validation': validation,
            'errorMsg': errorMsg
        };
    },

    checkInputTypes: function(table, capability, addedInputFields) {
        var validation = true;
        var errorMsg = "";
        var classificationFieldTypesName = "choice,string,html,reference,integer";
        var classificationFieldTypesLabel = "Choice, String, HTML, Reference, Integer";
        var regressionFieldTypesName = "choice,string,html,reference,integer,float,longint,decimal";
        var regressionFieldTypesLabel = "Choice, String, HTML, Reference, Integer, Floating Point Number, Long, Decimal";
        var tableRecord = new GlideRecord(table);
        for (var field in addedInputFields) {
            var element = tableRecord.getElement(addedInputFields[field]);
            var descriptor = element.getED();
            var type = descriptor.getInternalType();
            var choiceType = sn_ml.MLRecordUtil.getFieldType(table, addedInputFields[field]);
            //validating input field types for regression
            if (capability == "regression_trainer") {
                if (!regressionFieldTypesName.includes(type) && !regressionFieldTypesName.includes(choiceType)) {
                    validation = false;
                    errorMsg = gs.getMessage("Input Fields are only supported for {0} types", regressionFieldTypesLabel.toString());
                    break;
                }
            }
            //validating input field types for classification
            if (capability == "classification_trainer") {
                if (!classificationFieldTypesName.includes(type) && !classificationFieldTypesName.includes(choiceType)) {
                    validation = false;
                    errorMsg = gs.getMessage("Input Fields are only supported for {0} types", classificationFieldTypesLabel.toString());
                    break;
                }
            }
        }
        return {
            'validation': validation,
            'errorMsg': errorMsg
        };
    },

    targetSolThresholdValidation: function(threshold_val) {
        var validation = true;
        var errorMsg = "";
        if (JSUtil.nil(threshold_val) || isNaN(threshold_val) || (threshold_val < 0) || (threshold_val > 100)) {
            validation = false;
            errorMsg = gs.getMessage("Target Solution Coverage number should be between 0 and 100");
        }
        return {
            'validation': validation,
            'errorMsg': errorMsg
        };
    },

    preTrainingValidation: function(capability, current) {
        var validationObj = {
            'validation': true,
            'errorMsg': ""
        };


        switch (capability) {
            case "classification_trainer":
                //Step 1: Verifying the input field types.
                var addedInputFields = current.fields.split(',');
                validationObj = this.checkInputTypes(current.getValue("table"), current.capability.getRefRecord().getValue("value"), addedInputFields);
                if (!validationObj.validation) {
                    return validationObj;
                }

                //Step 2: min max record validation
                validationObj = this.minmaxValidation(current.getValue("table"), current.getValue("filter"), current.capability.getRefRecord().getValue("value"), addedInputFields);
                if (!validationObj.validation) {
                    return validationObj;
                }
                if (new MLGroupbyUtils().isGroupBy(current)) {
                    return {
                        'validation': false,
                        'errorMsg': "Please use APIs to train group-by solutions"
                    };
                }
				validationObj = this.missingEncoderWarningMessage(current);
                if (!validationObj.validation) {
                    return validationObj;
                }

                break;
            case "similarity_trainer":
                //Step 1 : min max record count validation
                validationObj = this.minmaxValidation(current.getValue("table"), current.getValue("filter"), current.capability.getRefRecord().getValue("value"));
                if (!validationObj.validation) {
                    return validationObj;
                }

                //Step 2: check if word corpus and details should not be empty
                validationObj = this.wordVectorValidation(current);
                if (!validationObj.validation) {
                    return validationObj;
                }
                break;
            case "clustering_trainer":
                //Step 1 : min max record count validation
                validationObj = this.minmaxValidation(current.getValue("table"), current.getValue("filter"), current.capability.getRefRecord().getValue("value"));
                if (!validationObj.validation) {
                    return validationObj;
                }


                //Step 2: check if word corpus and details should not be empty
                //Paris Release - levenshtein distance Advanced parameter or WVC is present not both'
				var solutionDefSysid = current.getUniqueValue();
				var advParam = this.advSolParamRec(solutionDefSysid, this.LD);
                if (!JSUtil.isEmpty(advParam)) {
					if ( JSUtil.nil(current.getValue("word_vector_corpus")) ) {
						var min_neighbors = this.advSolParamRec(solutionDefSysid,this.minimum_neighbor);
						if (!JSUtil.isEmpty(min_neighbors) && min_neighbors.isValidRecord() && min_neighbors.getValue('user_inputs') == '1') {
							return validationObj;
						} else {
							return {
								'validation': false,
								'errorMsg': " For Levenshtein Distance minimum neighbors needs to be 1"
							};
						}
					} else {
						return {
							'validation': false,
							'errorMsg': "Word Vector Corpus and Levenshtein Distance cannot be used together for clustering training"
						};
					}
                }
				
                validationObj = this.wordVectorValidation(current);
                if (!validationObj.validation) {
                    return validationObj;
                }
                break;
            case "regression_trainer":
                //Step 1: Verifying the input field types.
                var addedInputFields = current.fields.split(',');
                validationObj = this.checkInputTypes(current.getValue("table"), current.capability.getRefRecord().getValue("value"), addedInputFields);
                if (!validationObj.validation) {
                    return validationObj;
                }

                //Step 2: min max record validation
                validationObj = this.minmaxValidation(current.getValue("table"), current.getValue("filter"), current.capability.getRefRecord().getValue("value"), addedInputFields);
                if (!validationObj.validation) {
                    return validationObj;
                }
                if (new MLGroupbyUtils().isGroupBy(current)) {
                    return {
                        'validation': false,
                        'errorMsg': "Please use APIs to train group-by solutions"
                    };
                }
				validationObj = this.missingEncoderWarningMessage(current);
                if (!validationObj.validation) {
                    return validationObj;
                }
				
                break;
            default:
                return validationObj;
        }
        return validationObj;
    },


    wordVectorValidation: function(record) {
        var validation = true;
        var errorMsg = "";
        if (JSUtil.isEmpty(record)) {
            validation = false;
            errorMsg = gs.getMessage("Solution definition record is empty");
            return {
                'validation': validation,
                'errorMsg': errorMsg
            };
        }
        var wvc_gr = record.word_vector_corpus.getRefRecord();
        if (!wvc_gr.isValidRecord()) {
            validation = false;
            errorMsg = gs.getMessage("Word Corpus for solution definition record is empty");
            return {
                'validation': validation,
                'errorMsg': errorMsg
            };
        }

        if (wvc_gr.getValue('type') == 'pretrained') {
            return {
                'validation': validation,
                'errorMsg': errorMsg
            };
        }

        var wvc_content_gr = new GlideRecordSecure(this.MLBaseConstants.ML_WVC_DETAILS);
        wvc_content_gr.addQuery(this.MLBaseConstants.COL_WVC, wvc_gr.getUniqueValue());
        wvc_content_gr.query();
        if (wvc_content_gr.getRowCount() <= 0) {
            validation = false;
            errorMsg = gs.getMessage("Please add word corpus details for the word corpus used");
            return {
                'validation': validation,
                'errorMsg': errorMsg
            };
        }
        while (wvc_content_gr.next()) {
            var hasOneRow = this.hasMinOneRow(wvc_content_gr.getValue("table"), wvc_content_gr.getValue("filter"));
            if (!hasOneRow) {
                validation = false;
                errorMsg = gs.getMessage("'{0}' Word corpus content contains 0 records", wvc_content_gr.name);
                return {
                    'validation': validation,
                    'errorMsg': errorMsg
                };
            }
        }

        return {
            'validation': validation,
            'errorMsg': errorMsg
        };
    },
    
    missingEncoderWarningMessage : function(record){
		var validation = true;
		var warningMsg = "";
		var errorMsg = "";
		
		var wvc_gr = record.word_vector_corpus;
		if (JSUtil.nil(wvc_gr)) {
			warningMsg = gs.getMessage("Word Corpus for solution definition record is empty. System will attempt to create a word corpus if it identifies atleast one text column in the input data.");
			return {'validation':validation,'warningMsg':warningMsg};
		}
		//STRY50868523 and STRY50868460
		else {
			wvc_gr = wvc_gr.getRefRecord();
			var wvc_type = wvc_gr.getValue('type');

			var gr = new GlideRecordSecure(this.MLBaseConstants.ML_ADVANCED_SOL_SETTINGS);
			gr.addQuery(this.MLBaseConstants.SOL_DEFINITION_REF_FIELD, current.getUniqueValue());
			gr.addQuery("solution_parameters.key", "TF-IDF");
			gr.query();
			if(gr.next()) {
				var solParam = gr.solution_parameters.getRefRecord();
				var key = solParam.key.replace('-', '').toLowerCase();
				if(key !== wvc_type){
					validation = false;
					errorMsg = gs.getMessage("Your word corpus type must match your advanced solution parameter type. Example: If using a TF-IDF word corpus, use the TF-IDF parameter.");
				}
			} else {
				if(wvc_type === "tfidf"){
					validation = false;
					errorMsg = gs.getMessage("Your word corpus type must match your advanced solution parameter type. Example: If using a TF-IDF word corpus, use the TF-IDF parameter.");
				}
			}
			return {
				'validation': validation,
				'errorMsg': errorMsg
			};
		}
	},

    hasMinOneRow: function(table, encodedQuery) {
        var hasOneRow = false;
        if (table) {
            gr = new GlideRecordSecure(table);
            if (encodedQuery)
                gr.addEncodedQuery(encodedQuery);
            gr.setLimit(1);
            gr.query();
            hasOneRow = gr.getRowCount() > 0;
        }
        return hasOneRow;
    },

    advSolParamRec: function(sol_def_sys_id, key) {
        var advSolParamRec = {};
        var gr = new GlideRecordSecure("ml_advanced_solution_settings");
        gr.addQuery("ml_capability_definition", sol_def_sys_id);
        gr.addQuery("solution_parameters", key);
        gr.query();
        if (gr.next()) {
            return gr;
        }
        return advSolParamRec;
    },
	
	


    type: 'MlValidationHelper'
});
```