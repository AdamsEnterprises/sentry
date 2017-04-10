import React from 'react';
import _ from 'underscore';

import GroupEventDataSection from './eventDataSection';
import plugins from '../../plugins';
import {objectIsEmpty, toTitleCase, defined} from '../../utils';

const CONTEXT_TYPES = {
  'default': require('./contexts/default').default,
  'app': require('./contexts/app').default,
  'device': require('./contexts/device').default,
  'os': require('./contexts/os').default,
  'runtime': require('./contexts/runtime').default,
  'user': require('./contexts/user').default,
};

function getContextComponent(type) {
  return CONTEXT_TYPES[type] || plugins.contexts[type] || CONTEXT_TYPES.default;
}

function getSourcePlugin(pluginContexts, contextType) {
  if (CONTEXT_TYPES[contextType]) {
    return null;
  }
  for (let plugin of pluginContexts) {
    if (plugin.contexts.indexOf(contextType) >= 0) {
      return plugin;
    }
  }
  return null;
}

const ContextChunk = React.createClass({
  propTypes: {
    event: React.PropTypes.object.isRequired,
    group: React.PropTypes.object.isRequired,
    type: React.PropTypes.string.isRequired,
    alias: React.PropTypes.string.isRequired,
    value: React.PropTypes.object.isRequired,
    orgId: React.PropTypes.string,
    projectId: React.PropTypes.string
  },

  getInitialState() {
    return {
      isLoading: false
    };
  },

  componentWillMount() {
    this.syncPlugin();
  },

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.group.id != this.props.group.id ||
        prevProps.type != this.props.type) {
      this.syncPlugin();
    }
  },

  syncPlugin() {
    let sourcePlugin = getSourcePlugin(
      this.props.group.pluginContexts, this.props.type);
    if (!sourcePlugin) {
      this.setState({
        pluginLoading: false
      });
    } else {
      this.setState({
        pluginLoading: true,
      }, () => {
        plugins.load(sourcePlugin, () => {
          this.setState({pluginLoading: false});
        });
      });
    }
  },

  renderTitle(component) {
    let {value, alias, type} = this.props;
    let title = null;
    if (defined(value.title)) {
      title = value.title;
    } else {
      if (component.getTitle) {
        title = component.getTitle(value);
      }
      if (!defined(title)) {
        title = toTitleCase(alias);
      }
    }

    return (
      <span>
        {title + ' '}
        {alias !== type ? <small>({alias})</small> : null}
      </span>
    );
  },

  render() {
    // if we are currently loading the plugin, just render nothing for now.
    if (this.state.pluginLoading) {
      return null;
    }

    let {group, event, orgId, projectId, type, alias, value} = this.props;
    let Component = getContextComponent(type);

    // this can happen if the component does not exist
    if (!Component) {
      return null;
    }

    return (
      <GroupEventDataSection
          group={group}
          event={event}
          key={`context-${alias}`}
          type={`context-${alias}`}>
        <Component
          alias={alias}
          data={value}
          groupId={group.id}
          orgId={orgId}
          projectId={projectId}
          title={this.renderTitle(Component)} />
      </GroupEventDataSection>
    );
  },
});

const ContextsInterface = React.createClass({
  propTypes: {
    event: React.PropTypes.object.isRequired,
    group: React.PropTypes.object.isRequired,
    orgId: React.PropTypes.string,
    projectId: React.PropTypes.string
  },

  render() {
    let event = this.props.event;
    let children = [];

    let passedProps = _.pick(this.props, 'group', 'event', 'orgId', 'projectId');

    if (!objectIsEmpty(event.user)) {
      children.push((
        <ContextChunk
          type="user"
          alias="user"
          value={event.user}
          key="user"
          {...passedProps} />
      ));
    }

    let value;
    for (let key in event.contexts) {
      value = event.contexts[key];
      children.push((
        <ContextChunk
          type={value.type}
          alias={key}
          value={value}
          key={key}
          {...passedProps} />
      ));
    }

    return <div>{children}</div>;
  },
});

export default ContextsInterface;
