---
title: "GraphQLApplicationNamespace"
id: "graphqlapplicationnamespace"
---

API Name: global.GraphQLApplicationNamespace

```js
var GraphQLApplicationNamespace = (function() {

    function resolveApplicationScopeName() {
        if (!gs.isCurrentApplicationInGlobalScope())
            return gs.getCurrentApplicationScope();

        if (gs.getProperty('glide.appcreator.company.code'))
            return gs.getProperty('glide.appcreator.company.code');

        return gs.hasRole('maint') ? 'now' : 'global';
    }

    function unusableScopeNameError(scopeName) {
        var error = 'Unable to create application namespace from application scope "' + scopeName + '".' +
            ' Application scope is used for namespace and must be a valid GraphQL field name.';

        gs.addErrorMessage(error);
        gs.error(error);
    }
    
    function filterIllegalChars(name) {
        return name.replace(/[^a-z0-9]/ig, '');
    }
    
    function snakeOrKabobCaseToCamelCase(name) {
        return name.replace(/([-_][A-Za-z])/g, function(token) {
            return token.replace('[-_]', '').toUpperCase();
        });
    }

    function prefixWhenNameStartsWithNumber(name) {
        return /^[0-9]/.test(name) ? 'x' + name : name;
    }
    
    function createNamespace(scopeName) {
        return prefixWhenNameStartsWithNumber(filterIllegalChars(snakeOrKabobCaseToCamelCase(scopeName)));
    }
    
    function getNamespace() {
        var scopeName = resolveApplicationScopeName();
        var namespace = createNamespace(scopeName);

        if (namespace === '') {
            unusableScopeNameError(scopeName);
            return;
        }

        return namespace;
    }

    return {
        getNamespace: getNamespace
    };

})();
```