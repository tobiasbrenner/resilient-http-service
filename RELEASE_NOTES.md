# RELEASE NOTES
## 2.0.0 Release
### Breaking changes
#### Renaming ITopicConfig config properties to comply with naming scheme
The interface [ITopicConfig][topicConfig] property <code>onFailMessage</code> is renamed to <code>failMessage</code>. 

Reason: <code>on</code> prefixes are only used to identify event fns. In addition, the readme had to be changed,
because it was an outdated version of a previous implementation where there was indeed a topic specific event hook which
was removed before GitHub publication.

Same thing for the property <code>onFailResponse</code> of [ITopicConfig][topicConfig] interface.
It is renamed with the same reason to <code>failoverResponse</code> and
its readme is updated as well.

Sorry for the inconvenience.

## 2.0.1 Release
Update dependencies to fix high vulnerabilities caused by webpack-dev-middleware sub dependency.

New Angular version: 17.3.1

## 2.0.2 Release
- Update dependencies to fix high vulnerabilities 
- Remove HttpStatusCode.Locked from default retryOnStatusCodeList

[topicConfig]: projects/resilient-http-client/src/lib/model/type/resilience.rx-operator.type.ts
