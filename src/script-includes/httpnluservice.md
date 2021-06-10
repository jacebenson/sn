---
title: "HttpNLUService"
id: "httpnluservice"
---

API Name: global.HttpNLUService

```js
var HttpNLUService = Class.create();
HttpNLUService.prototype = {
    initialize: function() {
        this._loadDriver();
        this._loadConnectionConfigs();
    },

    type: 'HttpNLUService',

    getConnectionAttributeMap: function() {
        return this._connectionAttributesMap;
    },

    getAdapter: function() {
        return this._adapter;
    },

    getModelsConnectionInfos: function() {
        return this._getHttpConnectionInfos("models");
    },

    getModelIntentsConnectionInfos: function(modelId) {
        return this._getHttpConnectionInfos("intents", modelId);
    },

    /**
     * Returns the identity of a model from the model id and model label.
     *
     * @param modelId the id of the model
     * @param modelLabel the label of the model
     * @return the identity
     */
    getModelIdentity: function(modelId, modelLabel) {
        return !gs.nil(modelLabel) ? modelLabel : modelId;
    },

    /**
     * Returns the identity of a predicted intent from the intent id and intent label.
     *
     * @param intentId the id of the intent
     * @param intentLabel the label of the intent
     * @return the identity
     */
    getPredictedIntentIdentity: function(intentId, intentLabel) {
        return intentId;
    },

    /**
     * Returns the identity of a predicted entity from the entity id and entity label.
     *
     * @param entityId the id of the entity
     * @param entityLabel the label of the entity
     * @return the identity
     */
    getPredictedEntityIdentity: function(entityId, entityLabel) {
        return entityId;
    },

    getModelEntitiesConnectionInfos: function(modelId) {
        return this._getHttpConnectionInfos("entities", modelId);
    },

    getPredictConnectionInfos: function(modelId, utterance) {
        return this._getHttpConnectionInfos("prediction", modelId);
    },

    preparePredictRequestBody: function(utterance) {
        // inheritors must implement this
    },

    adaptProviderModels: function(modelsJSON) {
        return this.getAdapter().toModels(JSON.parse(modelsJSON));
    },

    adaptProviderModelIntents: function(modelId, modelIntentsJSON) {
        return this.getAdapter().toModelIntents(modelId, JSON.parse(modelIntentsJSON));
    },

    adaptProviderModelEntities: function(modelId, modelEntitiesJSON) {
        return this.getAdapter().toModelEntities(modelId, JSON.parse(modelEntitiesJSON));
    },

    adaptProviderPredictionResult: function(modelId, predictionResultJSON) {
        return this.getAdapter().toPredictionResult(JSON.parse(predictionResultJSON), modelId);
    },

    getHttpMethod: function(nluMethodType) {
        var httpConnectionInfos = this._httpConnectionInfosByType[nluMethodType];
        if (httpConnectionInfos && httpConnectionInfos.length) {
            return httpConnectionInfos[0].http_method;
        }
    },

    _loadDriver: function() {
        var driverGr = new GlideRecord("open_nlu_driver");
        driverGr.addQuery("script_name", "global." + this.type);
        driverGr.query();
        driverGr.next();
        if (!driverGr.isValid()) {
            throw new Error("NLU Driver record is not found for " + this.type + ".");
        }
        this._driverSysId = driverGr.getUniqueValue();
        this._adapter = eval('new ' + driverGr.adapter_script_name + '()');
    },

    _loadConnectionConfigs: function(customAttributes) {
        this._connectionAttributesMap = {
            "http_method": {"type": "string"},
            "api_version": {"type": "string"},
            "published_version":{"type": "string"},
            "http_headers":{"type": "object"},
            "rest_message_function_sys_id":{"type": "string"}
        };
        for (name in customAttributes) {
            if (customAttributes.hasOwnProperty(name)) {
                this._connectionAttributesMap[name] = customAttributes[name];
            }
        }

        // Load the Connection Configurations
        var driverConnectionGr = new GlideRecord('open_nlu_driver_http_connection');
        driverConnectionGr.addQuery("open_nlu_driver", this._driverSysId);
        driverConnectionGr.query();
        this._httpConnectionInfosByType = [];
        while (driverConnectionGr.next()) {
            var connectionInfo = {
                "endpoint": this._asString(driverConnectionGr.http_connection.connection_url),
                "http_connection_record_sys_id": this._asString(driverConnectionGr.http_connection),
                "http_method": this._asString(driverConnectionGr.http_method),
                "api_version": "",
                "published_version": "",
                "query_parameters": {},
                "http_headers": {},
                "type": "string",
                "rest_message_function_sys_id": ""
            };
            var connectionInfosForType = this._httpConnectionInfosByType[driverConnectionGr.nlu_resource_type];
            if (!connectionInfosForType) {
                connectionInfosForType = [];
                this._httpConnectionInfosByType[driverConnectionGr.nlu_resource_type] = connectionInfosForType;
            }
            connectionInfosForType.push(connectionInfo);

            var connectionAttributesGr = new GlideRecord("connection_attributes");
            connectionAttributesGr.addQuery("model", driverConnectionGr.http_connection.connection_alias);
            connectionAttributesGr.query();
            while (connectionAttributesGr.next()) {
                for (var key in this._connectionAttributesMap) {
                    if (!this._connectionAttributesMap.hasOwnProperty(key)) continue;
                    var item = this._connectionAttributesMap[key];
                    if (connectionAttributesGr.element == this._asString(key)) {
                        if ("object" == this._asString(item.type)) {
                            if (!connectionInfo[key]) {
                                connectionInfo[key] = {};
                            }
                            connectionInfo[key].type = "object";
                            var obj = JSON.parse(this._asString(connectionAttributesGr.default_value));
                            for (objKey in obj) {
                                if (obj.hasOwnProperty(objKey)) {
                                    connectionInfo[key][objKey] = obj[objKey];
                                }
                            }
                        } else {
                            connectionInfo[key].type = "string";
                            connectionInfo[key] = this._asString(connectionAttributesGr.default_value);
                        }
                    }
                }
            }
        }
        var errors = [];
        this._checkForResourceConnnection(this._httpConnectionInfosByType, "models", errors);
        this._checkForResourceConnnection(this._httpConnectionInfosByType, "intents", errors);
        this._checkForResourceConnnection(this._httpConnectionInfosByType, "entities", errors);
        this._checkForResourceConnnection(this._httpConnectionInfosByType, "prediction", errors);
        if (errors.length > 0) {
            throw new Error("Invalid connection configuration: " + errors.join(", "));
        }
    },

    _getHttpConnectionInfos: function(resourceType, modelId) {
        var connectionInfos = JSON.parse(JSON.stringify(this._httpConnectionInfosByType[resourceType]));
        for (var i = 0; i < connectionInfos.length; i++) {
            var connectionInfo = connectionInfos[i];
            for (name in this._connectionAttributesMap) {
                if (!this._connectionAttributesMap.hasOwnProperty(name)) continue;
                if (this._asString(connectionInfo[name].type) == "object") continue;
                connectionInfo.endpoint = connectionInfo.endpoint.replace("\{\{" + name + "\}\}", connectionInfo[name]);
            }

            if (!gs.nil(modelId)) {
                connectionInfo.endpoint = connectionInfo.endpoint.replace("\{\{model_id\}\}", modelId);
            }
        }
        return connectionInfos;
    },

    _checkForResourceConnnection: function(httpConnectionInfosByType, resourceType, errors) {
        if (gs.nil(httpConnectionInfosByType[resourceType])) {
            errors.push("No connection configured for NLU resource type '" + resourceType + "'.");
        }
    },

    _asString: function(value) {
        if (!gs.nil(value)) return '' + value;
    },
};
```