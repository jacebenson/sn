---
title: "IHUsageMetricsAggregator"
id: "ihusagemetricsaggregator"
---

API Name: global.IHUsageMetricsAggregator

```js
var IHUsageMetricsAggregator = Class.create();
var ih_usage_metrics_table = 'ua_ih_usage';
var exclusion_table = 'licensing_exclusion';
var byMonthFilter = "sys_created_onBETWEENjavascript:gs.beginningOfLast12Months()@javascript:gs.endOfLastMonth()";
var andOperator = "^";
IHUsageMetricsAggregator.prototype = {
    getExcludedScopes: function() {
        var scopes = [];
        var excludes = new GlideRecord(exclusion_table);
        excludes.addEncodedQuery('exclude_from_integrationhub=true');
        excludes.query();
        while (excludes.next()) {
            scopes.push(excludes.sys_scope + '');
        }
        return scopes;
    },
    getGlideAggregate: function(encoded_query, exclude_scope) {
        var aggregate = new GlideAggregate(ih_usage_metrics_table);
        aggregate.addAggregate('SUM', 'use_count');
        if (encoded_query)
            aggregate.addEncodedQuery(encoded_query);
        if (exclude_scope) {
            var scopes = this.getExcludedScopes();
            aggregate.addQuery('spoke_id', 'NOT IN', scopes.join(','));
        }
        aggregate.setGroup(false);
        aggregate.addTrend('sys_created_on', 'Month');
        aggregate.query();
        return aggregate;
    },
    getTransactionCountByMonth: function(exclude_scope) {
        var aggregate =
            this.getGlideAggregate(byMonthFilter, exclude_scope);
        return aggregate;
    },
    getTransactionCountForLastMonth: function(exclude_scope) {
        var aggregate = this.getGlideAggregate("sys_created_onONLast month@javascript:gs.beginningOfLastMonth()@javascript:gs.endOfLastMonth()", exclude_scope);
        if (aggregate.next())
            return parseInt(aggregate.getAggregate('SUM', 'use_count'));
        else
            return 0;
    },
    getTransactionCountForLast30Days: function(exclude_scope) {
        var aggregate = this.getGlideAggregate("sys_created_onONLast 30 days@javascript:gs.beginningOfLast30Days()@javascript:gs.endOfLast30Days()", exclude_scope);
        if (aggregate.next())
            return parseInt(aggregate.getAggregate('SUM', 'use_count'));
        else
            return 0;
    },
    getTransactionCountByMonthForCallerScope: function(callerScopeRef) {
        var encodedQuery = byMonthFilter + andOperator + "caller_scope_ref=" + callerScopeRef;
        var aggregate =
            this.getGlideAggregate(encodedQuery);
        return aggregate;
    },
    type: 'IHUsageMetricsAggregator'
};
```