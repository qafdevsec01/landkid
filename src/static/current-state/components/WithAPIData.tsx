import React from 'react';
import { Section } from './Section';

const DEFAULT_POLLING_INTERVAL = 15 * 1000; // 15 sec

const defaultLoading = () => <Section>Loading...</Section>;

export type Props<D> = {
  endpoint: string;
  poll?: number | boolean;
  renderError?: (err: Error, refresh: () => void) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  render?: (data: D, refresh: () => void) => React.ReactNode;
};

export type State = {
  error: Error | null;
  data: any;
  poll: number;
};

export class WithAPIData<T> extends React.Component<Props<T>, State> {
  interval: NodeJS.Timeout | null = null;
  state: State = {
    error: null,
    data: null,
    poll: this.props.poll === true ? DEFAULT_POLLING_INTERVAL : this.props.poll || 0,
  };

  fetchData() {
    fetch(`/${this.props.endpoint}`)
      .then((res) => res.json())
      .then((data) => this.setState({ data }))
      .catch((error) => this.setState({ error }));
  }

  componentDidMount() {
    this.fetchData();

    if (this.state.poll > 0) {
      this.interval = setInterval(this.fetchData.bind(this), this.state.poll);
    }
  }

  componentWillUnmount() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  componentWillReceiveProps(newProps: any) {
    if (newProps.endpoint !== this.props.endpoint) {
      this.setState(
        {
          data: null,
        },
        this.fetchData,
      );
    }
  }

  render() {
    let { error, data } = this.state;
    let { renderError, render, renderLoading } = this.props;

    if (error) {
      return renderError ? renderError(error, this.fetchData.bind(this)) : null;
    } else if (data) {
      return render ? render(data, this.fetchData.bind(this)) : null;
    }

    return renderLoading ? renderLoading() : defaultLoading();
  }
}
