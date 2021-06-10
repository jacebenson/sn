---
title: "VAPublisherReferenceChoiceCustomFormatter"
id: "vapublisherreferencechoicecustomformatter"
---

API Name: global.VAPublisherReferenceChoiceCustomFormatter

```js
var VAPublisherReferenceChoiceCustomFormatter = Class.create();
VAPublisherReferenceChoiceCustomFormatter.prototype = {
    initialize: function(propertyName, table, tableExtensions, tableParents) {
        this._table = table;
        this._loadDisplayConfigsFromProperty(propertyName, table, tableExtensions, tableParents);
    },

    format: function(gr) {
        if (gs.nil(gr) || !gr.isValid() || gr.getTableName() != this._table) return;
        var tableConfig = this._configsByTable[this._table];
        if (gs.nil(tableConfig)) return;
        if (!this._displayConfigApplies(gr, tableConfig)) return;
        var displayValueExpr = this._buildDisplayValueExpr(gr, tableConfig);
        if (!gs.nil(displayValueExpr)) return eval(displayValueExpr);
    },

    type: 'VAPublisherReferenceChoiceCustomFormatter',

    _loadDisplayConfigsFromProperty: function(propertyName, table, tableExtensions, tableParents) {
        this._configsByTable = {};

        var prop = gs.getProperty(propertyName, '[]');
        var refChoiceDisplayConfigs = JSON.parse(prop);
        if (gs.nil(refChoiceDisplayConfigs.length)) return;

        // Gather configs for tables at top levela
        for (var i = 0; i < refChoiceDisplayConfigs.length; i++) {
           this._configsByTable[refChoiceDisplayConfigs[i].table] = this._jsonCopy(refChoiceDisplayConfigs[i]);
        }

        // Gather table extension configs if this table is config'd for table extension
        for (var j = 0; j < refChoiceDisplayConfigs.length; j++) {
            var displayCfg = refChoiceDisplayConfigs[j];
            if (displayCfg.table && displayCfg.applies_to && displayCfg.applies_to.child_classes == 'true') {
                this._configsByTable[displayCfg.table] = displayCfg;

                // configure any sub-tables
                for (var x = 0; x < tableExtensions.length; x++) {
                    var subTable = tableExtensions[x];
                    if (this._configsByTable[subTable]) continue;
                    var subClassConfig = this._jsonCopy(displayCfg);
                    subClassConfig.table = subTable;
                    if (subClassConfig.applies_to)
                        subClassConfig.applies_to.child_classes == 'false';
                    this._configsByTable[subClassConfig.table] = subClassConfig;
                }

                // inherit a parent-table if possible
                for (var y = 0; y < tableParents.length; y++) {
                    var parentTable = tableParents[y];
                    var parentConfig = this._configsByTable[parentTable];
                    if (!gs.nil(parentConfig) && gs.nil(this._configsByTable[table])) {
                        var inheritedClassConfig = this._jsonCopy(parentConfig);
                        inheritedClassConfig.table = table;
                        if (inheritedClassConfig.applies_to)
                        inheritedClassConfig.applies_to.child_classes == 'false';
                        this._configsByTable[table] = inheritedClassConfig;
                        break;
                    }
                }
            }
        }
    },

    _displayConfigApplies: function(gr, displayCfg) {
        return (gr.getTableName() == displayCfg.table);
    },

    _jsonCopy: function(src) {
        return JSON.parse(JSON.stringify(src));
    },

    _buildDisplayValueExpr: function(gr, displayCfg) {
        var count = 0;
        var suffixSeparator = " + '";
        var expr = displayCfg.format.replace(/\{(.*?)\}/g, function(i, match) {
            var replacement;
            if (count == 0) {
                replacement = 'gr.' + match + suffixSeparator;
            } else {
                replacement = "' + " + 'gr.' + match + suffixSeparator;
            }
            count += 1;
            return replacement;
        });

        var extraSeparatorIdx = expr.lastIndexOf(suffixSeparator);
        var formatted = extraSeparatorIdx != -1 ?
            expr.substr(0, extraSeparatorIdx) + suffixSeparator + expr.substr(extraSeparatorIdx + suffixSeparator.length) + "'":
            expr;
        return formatted;
    }
};
```