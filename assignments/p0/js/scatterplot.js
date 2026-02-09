class Scatterplot {

  constructor(_config, _data, _meanAccuracy) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 500,
      containerHeight: _config.containerHeight || 250,
      margin: _config.margin || {top: 25, bottom: 40, left: 40, right: 40}
    }
    this.data = _data;
    this.meanAccuracy = _meanAccuracy;
    this.initVis()
  }

  initVis() {
    let vis = this;

    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    vis.xScale = d3.scaleLinear()
      .range([0, vis.width]);
    
    vis.yScale = d3.scaleBand()
      .range([0, vis.height])
      .paddingInner(0.15);

    vis.xAxis = d3.axisBottom(vis.xScale)
      .ticks(6)
      .tickSize(-vis.height + 10)
      .tickPadding(10);

    vis.yAxis = d3.axisLeft(vis.yScale)
      .tickSize(0)
      .tickFormat(d => 'Trial ' + d)
      .tickPadding(10);

    vis.svg = d3.select(vis.config.parentElement)
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    vis.chart = vis.svg.append('g') 
      .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    vis.xAxisGroup = vis.chart.append('g')
      .attr('class', 'axis x axis')
      .attr('transform', `translate(0,${vis.height})`);

    vis.yAxisGroup = vis.chart.append('g')
      .attr('class', 'axis y axis');

    // x axis label, chart title, and mean accuracy label text
    vis.chart.append('text')
      .attr('class', 'x-axis-title')
      .attr('y', vis.height + 20)
      .attr('x', vis.xScale(0))
      .attr('dy', '.71em')
      .style('text-anchor', 'start')
      .style('fill', 'black')
      .text('Accuracy');

    vis.chart.append('text')
      .attr('class', 'chart-title')
      .attr('y', -vis.config.margin.top / 2)
      .attr('x', -vis.config.margin.left)
      .attr('dy', '.71em')
      .style('text-anchor', 'start')
      .style('fill', 'black')
      .text('Trial/Accuracy Scatterplot');

    vis.chart.append('text')
      .attr('class', 'mean-accuracy-label')
      .attr('y', -vis.config.margin.top / 2)
      .attr('x', vis.width + vis.config.margin.right - 5)
      .attr('dy', '.71em')
      .style('text-anchor', 'end')
      .style('fill', 'black')
      .text('Mean Accuracy Per Trial');
  }

  updateVis() {
    let vis = this;

    vis.xValue = d => d.accuracy;
    vis.yValue = d => d.trial;

    let domain = d3.extent(this.data, d => d.accuracy);

    // if domain is smaller than [0, 1], then set to [0, 1]
    //    otherwise, set domain to the extent of accuracy
    vis.xScale.domain(domain[0] >= 0 && domain[1] <= 1 ? [0, 1] : domain);
    vis.yScale.domain(vis.data.map(vis.yValue));

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    vis.chart.selectAll('.point')
      .data(vis.data)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('r', 8)
      .attr('cx', d => vis.xScale(vis.xValue(d)))
      .attr('cy', d => vis.yScale(vis.yValue(d)) + vis.yScale.bandwidth() / 2)
      .attr('fill', 'lightblue')
      .attr('opacity', 0.5);

    vis.chart.selectAll('.meanAccuracy')
      .data(vis.meanAccuracy)
      .enter()
      .append('text')
      .attr('class', 'mean-accuracy')
      .attr('x', vis.width + 10)
      .attr('y', d => vis.yScale(d[0]) + vis.yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .text(d => d[1].toFixed(2));

    vis.xAxisGroup
      .call(vis.xAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').attr('opacity', 0.2));

    vis.yAxisGroup
      .call(vis.yAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.select('.domain').attr('opacity', 0.2));
  }
  
}