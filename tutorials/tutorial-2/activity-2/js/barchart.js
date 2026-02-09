class BarChart {

    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 500,
            containerHeight: _config.containerHeight || 120,
            margin: {top: 5, bottom: 20, left: 50, right: 20}
        }
        this.data = _data;
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.xScale = d3.scaleLinear()
            .range([0, vis.width]);

        vis.yScale = d3.scaleBand()
            .range([0, vis.height])
            .paddingInner(0.1);

        vis.xAxis = d3.axisBottom(vis.xScale)
            .ticks(6)
            .tickSizeOuter(0);
        
        vis.yAxis = d3.axisLeft(vis.yScale)
            .tickSizeOuter(0);
        
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
    }

    updateVis() {
        let vis = this;

        vis.xValue = d => d.sales;
        vis.yValue = d => d.month;

        vis.xScale.domain([0, d3.max(vis.data, vis.xValue)]);
        vis.yScale.domain(vis.data.map(vis.yValue));

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        vis.chart.selectAll('.bar')
            .data(vis.data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('width', d => vis.xScale(vis.xValue(d)))
            .attr('height', vis.yScale.bandwidth())
            .attr('y', d => vis.yScale(vis.yValue(d)))
            .attr('x', 0);

        vis.xAxisGroup.call(vis.xAxis);
        vis.yAxisGroup.call(vis.yAxis);
    }
}