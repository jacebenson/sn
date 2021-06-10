---
title: "NLUStudioUtil"
id: "nlustudioutil"
---

API Name: global.NLUStudioUtil

```js
var NLUStudioUtil = Class.create();

(function() {

    var SOLUTION_COMPLETE = 'solution_complete';
    var nluService = sn_ml.MLServiceUtil;

    function getPredictionResults(nluService, nluUtil, modelInfoObj, inputJson, options, confidenceThreshold) {
        var result = {};
        var modelInfo = JSON.stringify(modelInfoObj);
        gs.debug("NLU Model Info : " + modelInfo);

        var output = nluService.predict(
            modelInfo,
            inputJson, options);

        gs.debug("NLU Predict response : " + output);
        output = JSON.parse(output);

        result.status = output.status;
        if (output.status === 'success') {
            result.data = {
                intents: nluUtil.getResultFromTest(output.response.intents),
                confidenceThreshold: getConfidenceThrashold(nluService, modelInfoObj) || confidenceThreshold || 0.6
            };
        } else if (output.status === 'failure') {
            result.message = output.response;
        }



        return result;
    }

    function getConfidenceThrashold(nluService, modelInfoObj) {
        try {
            var modelInfo = JSON.stringify(modelInfoObj);
            var output = nluService.getAuthoringArtifact(modelInfo);
            gs.debug("NLU Model getAuthoringArtifact  : " + output);

            output = JSON.parse(output);
            if (output.status === 'success') {
                return output.response.confidenceThreshold;
            }
        } catch (e) {
            gs.debug("NLU Model getConfidenceThrashold error : " + e.message);
        }
        return 0;
    }

    NLUStudioUtil.prototype = {
        type: 'NLUStudioUtil',

        initialize: function() {
            this.nluService = nluService;
            this.nluUtil = new global.NLUUtil();
        },

        getModelState: function(sys_id) {
            var result = this.getModelStatus(sys_id);
            var state;
            switch (result.state) {
                case "trained":
                    state = gs.getMessage('Trained');
                    break;
                case "published":
                    state = gs.getMessage('Published');
                    break;
                default:
                    state = gs.getMessage('Draft');
                    break;
            }
            return state;
        },


        getModelStatus: function(sys_id) {
            var modelStatus, modelInfo, modelVersions;
            var result = {
                state: 'draft'
            };
            try {
                var modelObj = this.nluUtil.getModelDetails(sys_id);

                if (modelObj) {
                    modelInfo = [{
                        "solutionName": modelObj.name,
                        "solutionDomain": modelObj.domain,
                        "solutionScope": modelObj.scope
                    }];
                    modelInfo = JSON.stringify(modelInfo);
                    gs.debug("NLU Model Info : " + modelInfo);

                    output = this.nluService.getSolutionVersions(modelInfo);
                    gs.debug("NLU Model Versions response : " + output);
                    output = JSON.parse(output);

                    if (output.status === 'success') {
                        modelVersions = output.response[modelObj.name] && output.response[modelObj.name].versions;
                        var pVersion = 0,
                            tVersion = 0,
                            version, details;
                        var len = modelVersions.length;

                        for (var i = len - 1; i >= 0; i--) {
                            details = modelVersions[i];
                            version = parseInt(details.version);
                            if (details.active == "true") {
                                pVersion = version;
                                result.lastPublishedBy = this.nluUtil.getUserName(details.sys_updated_by);
                                result.lastPublishedOn = (new GlideDateTime(details.sys_updated_on)).getDisplayValueInternal();
                            }
                            if (version > tVersion && details.state === SOLUTION_COMPLETE) {
                                tVersion = version;
                                result.lastTrainedOn = (new GlideDateTime(details.sys_updated_on)).getDisplayValueInternal();
                            }
                        }
                        result.trainedVersion = tVersion;
                        result.publishedVersion = pVersion;
                        if (tVersion > pVersion) {
                            result.state = 'trained';
                        } else if (tVersion && pVersion && tVersion === pVersion) {
                            result.state = 'published';
                        }

                        this.nluUtil.updateModelData(sys_id, {
                            "trained_version": result.trainedVersion,
                            "published_version": result.publishedVersion,
                            "state": result.state
                        });
                        result.status = output.status;
                    }
                    gs.debug("NLU Model Status : " + JSON.stringify(result));
                }

            } catch (e) {
                result.status = 'failure';
                gs.debug("NLU Model getModelStatus error : " + e.message);
            }
            return result;
        },


        publishModel: function(sys_id) {
            var modelObj, modelInfo, domain, output, trainedVersion, publishedVersion;
            var result = {};

            try {

                modelObj = this.nluUtil.getModelDetails(sys_id);
                trainedVersion = modelObj.trainedVersion ? parseInt(modelObj.trainedVersion) : 0;
                publishedVersion = modelObj.publishedVersion ? parseInt(modelObj.publishedVersion) : 0;

                if (trainedVersion > 0) {
                    if (publishedVersion > 0 && (trainedVersion <= publishedVersion)) {
                        result.status = 'failure';
                        result.message = gs.getMessage('Invalid trained version.');
                        return result;
                    }

                    modelInfo = [{
                        "solutionName": modelObj.name,
                        "solutionDomain": modelObj.domain,
                        "solutionVersion": modelObj.trainedVersion,
                        "solutionScope": modelObj.scope
                    }];

                    domain = this.getCurrentDomain();
                    if (domain) {
                        modelInfo["solutionDomain"] = domain;
                    }
                    modelInfo = JSON.stringify(modelInfo);
                    gs.debug("NLU Model Info : " + modelInfo);
                    output = this.nluService.activate(modelInfo, {});
                    gs.debug("NLU publish response : " + output);
                    output = JSON.parse(output);
                    result.status = output.status;

                    if (output.status === 'success') {
                        publishedVersion = output.response.solutionVersion;
                        result.publishedVersion = publishedVersion;
                        this.nluUtil.updateModelData(sys_id, {
                            "published_version": publishedVersion,
                            "state": "published"
                        });
                    } else if (output.status === 'failure') {
                        result.errors = this.nluUtil.getErrorsFromResponse(output.response);
                    }
                } else {
                    result.status = 'failure';
                    result.message = gs.getMessage('Invalid trained version.');
                }
            } catch (e) {
                result.status = 'failure';
                result.message = e.message;
            }
            return result;
        },

        testUtterance: function(modelId, utterance) {
            var modelObj, inputJson, options, output,
                trainedVersion, publishedVersion, modelInfoObj;
            var result = {},
                domain, currDate;

            try {

                modelObj = this.nluUtil.getModelDetails(modelId);
                trainedVersion = modelObj.trainedVersion ? parseInt(modelObj.trainedVersion) : 0;
                publishedVersion = modelObj.publishedVersion ? parseInt(modelObj.publishedVersion) : 0;

                if (trainedVersion > 0 && utterance) {

                    domain = this.getCurrentDomain();
                    modelInfoObj = [{
                        "solutionName": modelObj.name,
                        "solutionDomain": modelObj.domain,
                        "solutionVersion": modelObj.trainedVersion,
                        "solutionScope": modelObj.scope
                    }];

                    if (domain) {
                        modelInfoObj["solutionDomain"] = domain;
                    }

                    inputJson = {
                        "utterance": utterance
                    };

                    currDate = (new Date()).toJSON();
                    options = {
                        confidenceThresholdOverride: '{ "all": 0.01 }',
                        clientRequestTime: currDate.split('T')[0]
                    };

                    inputJson = JSON.stringify(inputJson);

                    if (publishedVersion > 0) {
                        modelInfoObj[0].solutionVersion = publishedVersion;

                        output = getPredictionResults(this.nluService, this.nluUtil, modelInfoObj, inputJson, options, modelObj.confidanceThreshold);

                        result.status = output.status;
                        result.published = output.data;

                        if (output.message) {
                            result.message = output.message;
                        }

                    }

                    if (trainedVersion > publishedVersion) {
                        modelInfoObj[0].solutionVersion = trainedVersion;

                        output = getPredictionResults(this.nluService, this.nluUtil, modelInfoObj, inputJson, options, modelObj.confidanceThreshold);
                        result.status = output.status;
                        result.trained = output.data;
                        if (output.message) {
                            result.message = output.message;
                        }

                    }
                } else {
                    result.status = 'failure';
                    result.message = gs.getMessage('Invalid input data');
                }
            } catch (e) {
                result.status = 'failure';
                result.message = e.message;
            }
            return result;
        },

        trainModel: function(sys_id) {
            var modelObj, modelInfo, modelJson, output;
            var modelsJson = {},
                domain;
            var result = {};

            try {

                modelObj = this.nluUtil.getModelDetails(sys_id);

                modelInfo = [{
                    "solutionName": modelObj.name,
                    "solutionDomain": modelObj.domain,
                    "solutionScope": modelObj.scope
                }];

                modelInfo["requestMode"] = "draft";

                domain = this.getCurrentDomain();
                if (domain) {
                    modelInfo["solutionDomain"] = domain;
                }

                modelsJson = this.nluUtil.getTrainJSON(sys_id);

                modelsJson = JSON.stringify(modelsJson, null, 2);
                modelInfo = JSON.stringify(modelInfo);

                gs.debug("NLU Model Info : " + modelInfo);
                gs.debug("NLU Model JSON : " + modelsJson);
                output = this.nluService.train(modelInfo, modelsJson, {});

                gs.debug("NLU Model Train response : " + output);
                output = JSON.parse(output);
                result.status = output.status;
                if (output.status == 'success') {
                    result.trainedVersion = output.response.solutionVersion;

                    this.nluUtil.updateModelData(sys_id, {
                        "trained_version": result.trainedVersion,
                        "state": "trained",
                        "sys_updated_on": (new GlideDateTime())
                    });

                } else if (output.status == 'failure') {
                    result.errors = this.nluUtil.getErrorsFromResponse(output.response);
                }
            } catch (e) {
                result.status = 'failure';
                result.message = e.message;
            }
            return result;
        },

        validateRecord: function(data) {
            var modelInfo = {},
                output;
            var result = {},
                sample;

            try {
                var modelName;

                if (data.type === 'model') {
                    modelInfo[data.name] = {
                        name: data.name
                    };
                } else if (data.modelId) {
                    var modelObj = this.nluUtil.getModelJSON(data.modelId);
                    modelInfo[modelObj.name] = modelObj;
                    if (data.type === 'intent') {
                        modelInfo[modelObj.name].intents = [{
                            name: data.name
                        }];
                    } else if (data.type === 'entity') {
                        var entityObj = {
                            name: data.name,
                        };
                        if (data.pattern) {
                            sample = {};
                            sample.pattern = data.pattern;
                            entityObj.samples = [sample];
                        }
                        modelInfo[modelObj.name].entities = [entityObj];
                    } else if (data.type == 'vocabulary') {
                        var vocabObj = {
                            relatedTerms: data.relatedTerms
                        };
                        if (data.pattern) {
                            vocabObj.pattern = data.pattern;
                        }
                        modelInfo[modelObj.name].vocabulary = [vocabObj];
                    }
                }

                modelInfo = JSON.stringify(modelInfo);
                gs.debug("NLU Model Info : " + modelInfo);
                output = this.nluService.validate(modelInfo);
                gs.debug("NLU Model Validate response : " + output);
                output = JSON.parse(output);
                result.status = output.status;

                if (output.status === 'failure') {
                    result.errors = this.nluUtil.getErrorsFromResponse(output.response);
                }
            } catch (e) {
                result.status = 'failure';
                result.message = e.message;
            }
            return result;
        },


        validate: function(modelId, intentId, utterance, entityId) {
            var modelObj, intentObj, modelInfo = {},
                output;
            var result = {},
                entityObj, sample, vocabulary;

            try {

                modelObj = this.nluUtil.getModelJSON(modelId);
                vocabulary = this.nluUtil.getModelVocabulary(modelId);
				modelObj.vocabulary = vocabulary;

                modelInfo[modelObj.name] = modelObj;

                if (intentId) {

                    intentObj = this.nluUtil.getIntentDetails(intentId);
                    sample = {
                        name: intentObj.name,
                    };
                    if (entityId) {
                        entityObj = this.nluUtil.getEntityDetails(entityId);
                        sample.entities = [{
                            name: entityObj.name,
                            samples: [{
                                entityAnnotation: utterance
                            }]
                        }];
                    } else if (utterance) {
                         //Escape lookup vocabulary handlers (@) with @@ in utterance
                        sample.samples = [{
                            utterance: utterance.replace(this.nluUtil.lookUpRegEx,'$1@')
                        }];
                    } else {
                        sample.samples = this.nluUtil.getUtterancesByIntent(intentId);
                    }

                    modelInfo[modelObj.name].intents = [sample];
                } else {
                    modelInfo[modelObj.name] = this.nluUtil.getTrainJSON(modelId);
                }

                modelInfo = JSON.stringify(modelInfo);
                gs.debug("NLU Model Info : " + modelInfo);
                output = this.nluService.validate(modelInfo);
                gs.debug("NLU Model Validate response : " + output);

                output = JSON.parse(output);
                result.status = output.status;

                if (output.status === 'failure') {
                    result.errors = this.nluUtil.getErrorsFromResponse(output.response);
                }
            } catch (e) {
                result.status = 'failure';
                result.message = e.message;
            }
            return result;
        },


        getAllPublishedModels: function() {
            return this.nluUtil.getAllPublishedModels();
        },

        getEntitesByIntent: function(intentId, modelId, withChildren) {
            var modelPublishedTime = this._getModelPublishedTimestamp(modelId);
            if (gs.nil(modelPublishedTime)) return [];

            var allIntentEntities = this.nluUtil.getEntitesByIntentName(intentId, modelId, withChildren);
            return this._filterByPublishTime(allIntentEntities, modelPublishedTime);
        },

        getEntitesByModel: function(modelId, withChildren) {
            var modelPublishedTime = this._getModelPublishedTimestamp(modelId);
            if (gs.nil(modelPublishedTime)) return [];

            var allModelEntities = this.nluUtil.getEntitesByModelName(modelId, withChildren);
            return this._filterByPublishTime(allModelEntities, modelPublishedTime);
        },

        getSystemEntitesByModel: function(modelId, withChildren) {
            var modelPublishedTime = this._getModelPublishedTimestamp(modelId);
            if (gs.nil(modelPublishedTime)) return [];

            var allSystemModelEntities = this.nluUtil.getSystemEntitesByModelName(modelId, withChildren);
            return this._filterByPublishTime(allSystemModelEntities, modelPublishedTime);
        },

        getIntents: function(modelId, withChildren) {
            var modelPublishedTime = this._getModelPublishedTimestamp(modelId);
            if (gs.nil(modelPublishedTime)) return [];

            var allModelIntents = this.nluUtil.getIntentsByModelName(modelId, withChildren);
            return this._filterByPublishTime(allModelIntents, modelPublishedTime);
        },

        getCurrentDomain: function() {
            return gs.getSession().getCurrentDomainID();
        },

        _getModelPublishedTimestamp: function(modelId) {
            var model = this.nluUtil.getModelByName(modelId);
            if (gs.nil(model)) return;

            var modelStatus = this.getModelStatus(model.sys_id);
            return !gs.nil(modelStatus) && !gs.nil(modelStatus.lastPublishedOn) ?
                new GlideDateTime(modelStatus.lastPublishedOn).getNumericValue() :
                undefined;
        },

        _filterByPublishTime: function(allItems, modelPublishedTimestamp) {
            var publishedItems = [];
            for (var i = 0; i < allItems.length; i++) {
                var item = allItems[i];
                if (modelPublishedTimestamp >= item.createdOnTimestamp) {
                    publishedItems.push(item);
                }
            }
            return publishedItems;
        },
		
		getSupportedLanguages: function() {
            var res = JSON.parse(this.nluService.getLanguageSupport()).response.languages;
            var languages = [];
            Object.keys(res).forEach(function(key) {
                languages.push({
                    label: res[key].name,
                    value: key
                });
            });
            return languages;
        },

        getSystemEntitiesLang: function() {
            var languages = this.getSupportedLanguages();
            var sysEntities = {};
            var entityRec = new GlideRecord("sys_nlu_sys_entity");
            entityRec.query();
            while (entityRec.next()) {
                var name = entityRec.getValue('name');
                languages.forEach(function(obj) {
					var lang = obj.value;
                    if (!sysEntities[lang]) sysEntities[lang] = {};
                    sysEntities[lang][name] = gs.getMessageLang('nlu_entity_' + name, lang);
                });
            }
            return sysEntities;
        },

    };

})();
```