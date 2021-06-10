---
title: "NLUUtil"
id: "nluutil"
---

API Name: global.NLUUtil

```js
var NLUUtil = Class.create();
(function() {

    var MODEL_DEFAULT_LANG = 'en';
    var TABLE_VALUES_LIMIT = 1000;


    NLUUtil.prototype = {
        type: 'NLUUtil',

        initialize: function() {
            this.lookUpRegEx = /(^@|\s@)/g;
        },
		
		getModelJSON: function(modelId) {
			var modelObj = {
				schemaVersion: 'NY-1'
			};
			var modelGr = new GlideRecord('sys_nlu_model');
            if (modelGr.get(modelId)) {
				var name = modelGr.getValue('name');
				var language = modelGr.getValue('language') || MODEL_DEFAULT_LANG;
				var solutionInfoJSON = [{
					solutionName: name,
					solutionDomain: modelGr.getValue('sys_domain'),
					solutionScope: modelGr.getValue('sys_scope')
				}];
				modelObj.name = name,
				modelObj.version = this.getModelVersion(JSON.stringify(solutionInfoJSON), language),
				modelObj.language = language,
				modelObj.confidenceThreshold = modelGr.getValue('confidence_threshold');
            }
			return modelObj;
		},
		
		getModelVersion: function(solutionInfoJSON, language) {
            var res = JSON.parse(sn_ml.MLServiceUtil.getModelVersion(solutionInfoJSON, language));
            return res.response.version;
        },

        getTrainJSON: function(modelId) {
			var modelObj = {};
			
            if (modelId) {
                modelObj = this.getModelJSON(modelId);
                modelObj.intents = this.getIntents(modelId, true);
                this._pruneIntentMetaData(modelObj.intents);
                modelObj.entities = this.getEntitesByModel(modelId, true);
                this._pruneEntityMetaData(modelObj.entities);
                modelObj.vocabulary = this.getModelVocabulary(modelId);
            }

            return modelObj;
        },
		

        getModelDetails: function(sys_id) {
            var modelObj, modelStatus;
            var nluModelRec = new GlideRecord("sys_nlu_model");

            if (nluModelRec.get(sys_id)) {
                modelObj = {};
                modelObj.name = nluModelRec.getValue("name");
                modelObj.description = nluModelRec.getValue("description");
                modelObj.language = nluModelRec.getValue("language") || MODEL_DEFAULT_LANG;
                modelObj.scope = nluModelRec.getValue("sys_scope");
                modelObj.domain = nluModelRec.getValue("sys_domain");

                modelStatus = this.getModelStatus(sys_id);
                modelObj.trainedVersion = modelStatus.trainedVersion;
                modelObj.publishedVersion = modelStatus.publishedVersion;
            }
            return modelObj;
        },

        getModelStatus: function(sys_id) {
            var modelStatus;
            var nluModelRec = new GlideRecord("sys_nlu_model_status");

            if (nluModelRec.get('model', sys_id)) {
                modelStatus = {};
                modelStatus.trainedVersion = nluModelRec.getValue("trained_version");
                modelStatus.publishedVersion = nluModelRec.getValue("published_version");
            }
            return modelStatus;
        },

        getIntentDetails: function(sys_id) {
            var intentObj;
            var intentRec = new GlideRecord("sys_nlu_intent");
            if (intentRec.get(sys_id)) {
                intentObj = {};
                intentObj.name = intentRec.getValue("name");
            }
            return intentObj;
        },

        getEntityDetails: function(sys_id) {
            var entityObj;
            var entityRec = new GlideRecord("sys_nlu_entity");

            if (entityRec.get(sys_id)) {
                entityObj = {};
                entityObj.name = entityRec.getValue("name");
                entityObj.type = entityRec.getValue("type");
            }
            return entityObj;
        },

        getAllPublishedModels: function() {
            var modelsArray = [],
                id, nluModelRec;
            var modelObj, name, modelName;

            try {
                var mlSolutionRec = new GlideRecord("ml_solution");
                mlSolutionRec.addQuery("active", true);
                mlSolutionRec.addQuery("capability", "nlu_trainer");
                mlSolutionRec.query();

                while (mlSolutionRec.next()) {

                    name = mlSolutionRec.getValue("solution_name");
                    modelName = name.substring(3);
                    nluModelRec = new GlideRecord("sys_nlu_model");
                    modelObj = {};

                    if (nluModelRec.get("name", modelName)) {
                        modelObj.name = nluModelRec.getValue("name");
                        modelObj.displayName = nluModelRec.getValue("display_name");
                        modelObj.id = nluModelRec.getValue("sys_id");
                        modelObj.language = nluModelRec.getValue("language") || MODEL_DEFAULT_LANG;
                        modelObj.scope = nluModelRec.getValue("sys_scope");
                        modelObj.publishedVersion = mlSolutionRec.getValue("version");
                        modelsArray.push(modelObj);
                    }
                }
            } catch (e) {}
            return modelsArray;
        },
        getIntentsByModelName: function(modelName, withChildren) {
            var modelObj = this.getModelByName(modelName);
            return this.getIntents(modelObj.sys_id, withChildren);
        },
        getIntents: function(modelId, withChildren) {
            var intentsArray = [];
            var intentObj, intentId;

            var intentRec = new GlideRecord("sys_nlu_intent");
            intentRec.addQuery("model", modelId);
            intentRec.query();
            while (intentRec.next()) {
                intentId = intentRec.getValue("sys_id");
                intentObj = {};
                intentsArray.push(intentObj);
                intentObj.name = intentRec.getValue("name");
                intentObj.createdOnTimestamp = this._toTimezoneAdjustedTimestamp(new GlideDateTime(intentRec.getValue("sys_created_on")));
                if (!withChildren) {
                    intentObj.id = intentId;
                    continue;
                }
                intentObj.samples = this.getUtterancesByIntent(intentId);
                intentObj.entities = this.getEntitesByIntent(intentId, { withChildren: true, excludeTemplates: true });
				var templates = this.getEntitesByIntent(intentId, { withChildren: true, templatesOnly: true });
                if (templates.length > 0)
					intentObj.templates = templates;
            }
            return intentsArray;
        },

        getUtterancesByIntent: function(intent_sys_id) {
            var utteranceArray = [];
            var utterance;

            var utteranceRec = new GlideRecord("sys_nlu_utterance");
            utteranceRec.addQuery("intent", intent_sys_id);
            utteranceRec.query();
            while (utteranceRec.next()) {
                utterance = {};
                utterance.utterance = utteranceRec.getValue("utterance");
                //Escape lookup vocabulary handlers (@) with @@ in utterance
                utterance.utterance = utterance.utterance.replace(this.lookUpRegEx, '$1@');
                utteranceArray.push(utterance);
            }
            return utteranceArray;
        },

        getUtterancesByEntity: function(entityId, intentId) {
            var utteranceArray = [];
            var annotation;

            var utteranceRec = new GlideRecord("m2m_sys_nlu_utterance_entity");
            utteranceRec.addQuery("entity", entityId);
            if (intentId) {
                var joinQuery = utteranceRec.addJoinQuery('sys_nlu_utterance', 'utterance', 'sys_id');
                joinQuery.addCondition("intent", intentId);
            }
            utteranceRec.query();

            while (utteranceRec.next()) {
                annotation = utteranceRec.getValue("annotation");
                utteranceArray.push(JSON.parse(annotation));
            }
            return utteranceArray;
        },

        getEntitesByIntentName: function(intentName, modelName, withChildren) {
            var modelObj = this.getModelByName(modelName);
            if (intentName) {
                var intentObj = this.getIntentByName(modelObj.sys_id, intentName);
                return this.getEntitesByIntent(intentObj.sys_id, { withChildren: withChildren });
            }
        },

        getEntitesByIntent: function(intentId, options) {
            var entityRec = new GlideRecord("sys_nlu_entity");
            entityRec.addNullQuery('model');
            //For train JSON open ended entities are included separately, but for open NLU all entities are included.
            if (options) {
                if (options.excludeTemplates) {
                    entityRec.addQuery("type", "!=", "open_ended");
                }
                if (options.templatesOnly) {
                    entityRec.addQuery('type', 'open_ended');
                }
            }
            var joinQuery = entityRec.addJoinQuery('m2m_sys_nlu_intent_entity', 'sys_id', 'entity');
            joinQuery.addCondition("intent", intentId);

            return this.getEntities(entityRec, options.withChildren, intentId);
        },

        getEntitesByModelName: function(modelName, withChildren) {
            var modelObj = this.getModelByName(modelName);
            return this.getEntitesByModel(modelObj.sys_id, withChildren);
        },

        getEntitesByModel: function(modelId, withChildren) {
            var entityRec = new GlideRecord("sys_nlu_entity");
            entityRec.addQuery("model", modelId);

            return this.getEntities(entityRec, withChildren);
        },
        getSystemEntitesByModelName: function(modelName, withChildren) {
            var modelObj = this.getModelByName(modelName);
            return this.getSystemEntitesByModel(modelObj.sys_id, withChildren);
        },

        getSystemEntitesByModel: function(modelId, withChildren) {
            var entityRec = new GlideRecord("sys_nlu_sys_entity");
            var joinQuery = entityRec.addJoinQuery('m2m_sys_nlu_model_sys_entity', 'sys_id', 'sys_entity');
            joinQuery.addCondition("model", modelId);
            joinQuery.addCondition("active", true);

            return this.getEntities(entityRec, withChildren);
        },

        getEntities: function(entityRec, withChildren, intentId) {
            var entityArray = [];
            var entityObj, entityId, utterances, entityType, entityValues;

            entityRec.query();

            while (entityRec.next()) {
                entityId = entityRec.getValue("sys_id");
                entityType = entityRec.getValue("type");
                entityObj = {};
                entityObj.name = entityRec.getValue("name");
                entityObj.createdOnTimestamp = this._toTimezoneAdjustedTimestamp(new GlideDateTime(entityRec.getValue("sys_created_on")));

                if (!withChildren) {
                    entityObj.id = entityId;
                    entityArray.push(entityObj);
                    continue;
                }

                utterances = this.getUtterancesByEntity(entityId, intentId);
                entityValues = entityRec.getValue("values_list");

                if (entityType == 'list') {
                    entityValues = entityValues && entityValues.split(',');
                    entityObj.categories = this.getEntityCategories(entityValues, utterances);
                } else if (entityType == 'pattern') {
                    entityObj.samples = [{
                        pattern: entityValues
                    }];
                } else if (entityType == 'open_ended') {
                    entityObj.samples = this.getEntityAnnotations(utterances, null, true);
                } else {
                    entityObj.samples = this.getEntityAnnotations(utterances);
                    if (entityType == 'typed') {
                        entityObj.parent = 'entity:GLOBAL.' + entityRec.base_entity.name.toString();
                    }
                }
                if (!(typeof entityObj.samples != 'undefined' && entityObj.samples.length == 0)) {
                    entityArray.push(entityObj);
                }

            }

            return entityArray;
        },

        getEntityAnnotations: function(utterances, cat, isOpenEnded) {
            var samples = [];
            if (utterances) {
                utterances.forEach(function(annotations) {
                    annotations.forEach(function(annotation) {
                        if (cat && cat === annotation.cat || !cat) {
                            var annotatedString = annotation.annotatedString.replace(/phrase="@/, 'phrase="@@');
                            annotatedString = annotatedString.split(' ').map(function(word) {
                                if (word.startsWith('@')) return '@' + word;
                                return word;
                            }).join(' ');
                            samples.push(isOpenEnded ? { annotation: annotatedString }
										 : { entityAnnotation: annotatedString });
                        }
                    });
                });
            }
            return samples;
        },

        getEntityCategories: function(entityValues, utterances) {
            var categories = [],
                samples;
            that = this;
            if (entityValues && utterances) {
                entityValues.forEach(function(category) {
                    samples = that.getEntityAnnotations(utterances, category);
                    samples && samples.length > 0 && categories.push({
                        "category": category,
                        "samples": samples
                    });
                });
            }
            return categories;
        },

        wordToRegex: function wordToRegex(word) {
            return "\\b(?i)" + word + "\\b";
        },

        getModelVocabulary: function(modelId) {
            var vocabularyArray = [];
            var vocabularyObj, vocabularyId, relatedTerms, type;

            var vocabularyRec = new GlideRecord("sys_nlu_vocabulary");
            vocabularyRec.addQuery("model", modelId);
            vocabularyRec.query();
            while (vocabularyRec.next()) {
                vocabularyObj = {};
                type = vocabularyRec.getValue("type");
                if (type === 'pattern') {
                    vocabularyObj.pattern = vocabularyRec.getValue("pattern");
                } else if (type === 'lookup') {
                    vocabularyObj.handle = vocabularyRec.getValue("name");
                    vocabularyObj.simpleValues = { 
                        values: this.getTableFieldValues(vocabularyRec.getValue("table"),
                                                        vocabularyRec.getValue("field_name"))
                    };
                } else {
                    vocabularyObj.pattern = this.wordToRegex(vocabularyRec.getValue("name"));
                }
                relatedTerms = vocabularyRec.getValue("related_terms");
                vocabularyObj.relatedTerms = (relatedTerms && relatedTerms.split(',')) || [];
                vocabularyArray.push(vocabularyObj);
            }

            return vocabularyArray;
        },

        getTableFieldValues: function(tableName, fieldName) {
            var records = [],
                value;
            if (tableName && fieldName) {
                try {
                    var tableRec = new GlideRecord(tableName);
                    var glideElement = tableRec.getElement(fieldName);
                    var descriptor = glideElement.getED();
                    if (descriptor.getInternalType() === 'choice' 
						|| (descriptor.getInternalType() === 'string' && descriptor.getChoiceField())) {
						var cList = new GlideChoiceList();
                        if (new GlideRecord(tableName).isValidField(fieldName)) {
                            var clg = new GlideChoiceListGenerator(tableName, fieldName);
                            clg.setCache(false);
                            clg.setNone(false);
                            clg.get(cList);
                            cList.removeChoice('NULL_OVERRIDE');
                            for (var i = 0, l = cList.getSize(); i < l; i++) {
                                records.push(cList.getChoice(i).getLabel());
                            }
                        }
                    } else {
						var count = 0;
                        var gAgg = new GlideAggregate(tableName);
                        gAgg.addNotNullQuery(fieldName);
                        gAgg.groupBy(fieldName);
                        gAgg.orderBy(fieldName);
                        gAgg.query();
                        while (gAgg.next() && count < TABLE_VALUES_LIMIT) {
                            records.push(gAgg.getValue(fieldName));
							count++;
                        }
                    }
                } catch (e) {
                    gs.addErrorMessage("Unable to fetch field values from : " + tableName);
                }
            }
            return records;
        },

        updateModelData: function(sys_id, data) {

            var nluModelRec = new GlideRecord("sys_nlu_model_status");

            if (nluModelRec.get('model', sys_id)) {
                data && Object.keys(data).forEach(function(key) {
                    nluModelRec.setValue(key, data[key]);
                });
                nluModelRec.update();
            } else {
                nluModelRec.setValue("model", sys_id);
                data && Object.keys(data).forEach(function(key) {
                    nluModelRec.setValue(key, data[key]);
                });
                nluModelRec.insert();
            }
        },

        getModelByName: function(modelName) {
            var nluModelRec = new GlideRecord("sys_nlu_model");
            var modelObj = {};

            if (nluModelRec.get("name", modelName)) {
                modelObj.name = nluModelRec.getValue("name");
                modelObj.displayName = nluModelRec.getValue("display_name");
                modelObj.sys_id = nluModelRec.getValue("sys_id");
            }
            return modelObj;
        },

        getIntentByName: function(modelId, intentName) {
            var nluIntentRec = new GlideRecord("sys_nlu_intent");
            var intentObj = {};
            nluIntentRec.addQuery("name", intentName);
            nluIntentRec.addQuery("model", modelId);
            nluIntentRec.query();

            if (nluIntentRec.next()) {
                intentObj.name = nluIntentRec.getValue("name");
                intentObj.sys_id = nluIntentRec.getValue("sys_id");
            }
            return intentObj;
        },

        getEntityByName: function(modelId, entityName) {
            var entityObj = {};
            var entityRec = new GlideRecord('sys_nlu_entity');
            var joinQuery = entityRec.addJoinQuery('m2m_sys_nlu_intent_entity', 'sys_id', 'entity');
            joinQuery.addCondition('intent.model', modelId);
            entityRec.addEncodedQuery('^NQmodel=' + modelId);
            entityRec.addQuery('name', entityName);
            entityRec.query();
            if (entityRec.next()) {
                entityObj.name = entityRec.getValue('name');
                entityObj.sys_id = entityRec.getValue('sys_id');
            }

            return entityObj;
        },

        getUtteranceByName: function(intentId, utterance) {
            var nluUtteranceRec = new GlideRecord("sys_nlu_utterance");
            var utteranceObj = {};
            nluUtteranceRec.addQuery("utterance", utterance);
            nluUtteranceRec.addQuery("intent", intentId);
            nluUtteranceRec.query();

            if (nluUtteranceRec.next()) {
                utteranceObj.utterance = nluUtteranceRec.getValue("utterance");
                utteranceObj.sys_id = nluUtteranceRec.getValue("sys_id");
            }
            return utteranceObj;
        },

        getResultFromTest: function(intents) {
            var top3Intents = [];
            var intent, name, namePath;
            if (intents) {
                for (var i = 0, l = intents.length; i < l && i < 3; i++) {
                    intent = intents[i];
                    var entities = [];

                    intent.entities.forEach(function(entity) {
                        namePath = entity.name;
                        if (parseFloat(entity.score) > 0.4) {
                            namePath = namePath.split(":")[1];
                            namePath = namePath.split(".");
                            name = namePath[namePath.length - 1];
                            entities.push({
                                name: name,
                                score: entity.score,
                                value: (entity.normalization && entity.normalization.value) || entity.value
                            });
                        }
                    });
                    top3Intents.push({
                        name: intent.intentName,
                        score: intent.score,
                        entities: entities
                    });
                }
            }
            return top3Intents;
        },

        getErrorsFromResponse: function(response) {
            var messages = response.messages;
            var errors = [];
            var that = this;
            messages.forEach(function(record) {
                var at, type, path, modelName;
                var intentName, utterance, unknown, entityObj, entityName;
                var modelObj, intentObj, utteranceObj;
                var errorObj = {};
                if (record.type === 'ERROR') {
                    if (record.fields) {
                        gs.debug('Invalid json : ' + record.at);
                        gs.debug('Invalid json fields : ' + record.fields);
                    }
                    if (record.at) {
                        at = record.at;
                        path = at.split(":");
                        type = path[0];
                        path = path[1].split(".");
                        modelName = path[0];
                        if (type === 'intent') {
                            intentName = path[1];
                        } else if (type === 'entity') {
                            entityName = path[path.length - 1];
                            if (path.length == 3) {
                                intentName = path[1];
                            }
                        }
                        modelObj = that.getModelByName(modelName);
                        modelObj.name = modelObj.displayName;
                        intentObj = intentName && that.getIntentByName(modelObj.sys_id, intentName);
                        entityObj = entityName && that.getEntityByName(modelObj.sys_id, entityName);
                        errorObj = {
                            message: gs.getMessage(record.messageKey, record.replacements),
                            type: type,
                            model: modelObj,
                            intent: intentObj,
                            entity: entityObj
                        };
                        if (record.sample) {
                            utterance = record.sample.value;
                            unknown = record.sample.tokens;
                            errorObj.utterance = utterance;
                            errorObj.unknown = unknown;
                        }
                        errors.push(errorObj);
                    }

                }
            });
            return errors;
        },

        canPublish: function(modelId) {
            var modelStatusGr = new GlideRecord('sys_nlu_model_status');
            modelStatusGr.query('model', modelId);
            if (modelStatusGr.next()) {
                var trainedVersion = this.getIntValue(modelStatusGr.getValue('trained_version'));
                var publishedVersion = this.getIntValue(modelStatusGr.getValue('published_version'));
                return trainedVersion > 0 && trainedVersion > publishedVersion;
            }
            return false;
        },

        getIntValue: function(val) {
            return (val ? parseInt(val, 10) : 0);
        },

        copyRecord: function(table, fields, obj) {
            var gr = new GlideRecord(table);
            gr.newRecord();
            fields.forEach(function(field) {
                gr[field] = obj[field];
            });
            return gr.insert();
        },

        getObjectFromGR: function(gr, fields) {
            var obj = {};
            fields.forEach(function(field) {
                obj[field] = gr.getValue(field);
            });
            return obj;
        },
        getUserName: function(userId) {
            var userName, user = new GlideRecord('sys_user');
            if (user.get('user_name', userId)) {
                userName = user.getDisplayValue();
            }
            return userName;
        },
        getModelScope: function(modelId) {
            var scopeId = 'global';
            var gr = new GlideRecord('sys_nlu_model');
            if (gr.get(modelId)) {
                scopeId = gr.getValue('sys_scope');
            }
            return scopeId;
        },

        _pruneIntentMetaData: function(intents) {
            if (!gs.nil(intents) && !gs.nil(intents.length)) {
                for (var i = 0; i < intents.length; i++) {
                    delete intents[i].createdOnTimestamp;
                    this._pruneEntityMetaData(intents[i].entities);
                    this._pruneEntityMetaData(intents[i].templates);
                }
            }
        },

        _pruneEntityMetaData: function(entities) {
            if (!gs.nil(entities) && !gs.nil(entities.length)) {
                for (var i = 0; i < entities.length; i++) {
                    delete entities[i].createdOnTimestamp;
                }
            }
        },

        _toTimezoneAdjustedTimestamp: function(glideDateTime) {
            if (gs.nil(glideDateTime)) return;
            return (parseInt(glideDateTime.getNumericValue()) + parseInt(glideDateTime.getTZOffset()));
        }
    };
})();
```