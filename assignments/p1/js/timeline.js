class Timeline {

  /**
   * Class constructor with initial configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      disasterCategories: _config.disasterCategories,
      containerWidth: 800,
      containerHeight: 900, // can change
      tooltipPadding: 15,
      margin: {top: 120, right: 20, bottom: 20, left: 45},
      legendWidth: 170,
      legendHeight: 8,
      legendRadius: 5
    }
    this.data = _data;
    this.selectedCategories = [];
    this.initVis();
  }
  
  /**
   * We initialize the arc generator, scales, axes, and append static elements
   */
  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // ---- x axis initialization ----
    // x is day-of-year (reference year), ticks at first of each month
    vis.referenceYear = 2001; // non-leap year
    vis.xScale = d3.scaleTime()
      .domain([new Date(vis.referenceYear, 0, 1), new Date(vis.referenceYear, 11, 31)])
      .range([0, vis.width]);

    vis.xAxis = d3.axisTop(vis.xScale)
      .tickSizeOuter(0)
      .tickValues(d3.timeMonth.range(new Date(vis.referenceYear, 0, 1), new Date(vis.referenceYear, 11, 31)).map(d => d))
      .tickFormat(d3.timeFormat('%b'))
      .tickSize(10);

    // helper: map real date to its month/day in the reference year
    vis.xValue = d => new Date(vis.referenceYear, d.date.getMonth(), d.date.getDate());

    // ---- y axis initialization ----
    // y axis handling so that axis stays constant
    const minDate = d3.min(vis.data, d => d.date);
    const maxDate = d3.max(vis.data, d => d.date);

    /*
    for y axis to display full range [1980, 2017] without showing 2018, we set yStart to floor of minDate so axis starts at 1980.
    don't want 2018 to show but we want the space between 2017 and the x axis, so we set yEnd to 1/1/2018 but don't show that year
    */
    vis.yStart = d3.timeYear.floor(minDate);
    const lastDataYearStart = d3.timeYear.floor(maxDate);
    vis.yEnd = d3.timeYear.offset(lastDataYearStart, 1);

    vis.yScale = d3.scaleTime()
      .range([vis.height, 0])
      .domain([vis.yStart, vis.yEnd]);

    // prevents showing 2018
    const yTickEndExclusive = d3.timeYear.offset(lastDataYearStart, 1);

    vis.yAxis = d3.axisLeft(vis.yScale)
      .tickSizeOuter(0)
      .tickSize(-vis.width)
      .tickValues(d3.timeYear.range(vis.yStart, yTickEndExclusive))
      .tickFormat(d3.timeFormat('%Y'))
      .tickPadding(10);

    // radius scale: map disaster cost (in $ billions) to circle/arc radius (px)
    const costExtent = d3.extent(vis.data, d => d.cost);
    vis.radiusScale = d3.scaleSqrt()
      .domain([Math.max(0, costExtent[0] ?? 0), costExtent[1] ?? 0])
      .range([4, 120]);

    // Initialize arc generator that we use to create the SVG path for the half circles.
    vis.arcGenerator = d3.arc()
      .outerRadius(d => vis.radiusScale(d.cost))
      .innerRadius(0)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    // Define size of SVG drawing area
    vis.svg = d3.select(vis.config.parentElement).append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    // Append group element that will contain our actual chart 
    // and position it according to the given margin config
    vis.chartArea = vis.svg.append('g')
        .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    // append axis groups
    vis.xAxisGroup = vis.chartArea.append('g')
        .attr('class', 'axis x-axis');

    vis.yAxisGroup = vis.chartArea.append('g')
        .attr('class', 'axis y-axis');

    // Initialize clipping mask that covers the whole chart
    vis.chartArea.append('defs')
      .append('clipPath')
        .attr('id', 'chart-mask')
      .append('rect')
        .attr('width', vis.width)
        .attr('y', -vis.config.margin.top)
        .attr('height', vis.config.containerHeight);

    // Apply clipping mask to 'vis.chart' to clip semicircles at the very beginning and end of a year
    vis.chart = vis.chartArea.append('g')
        .attr('clip-path', 'url(#chart-mask)');

    // ---- colors for semicircle marks based on category ----
    const disasterCategories = Array.from(new Set(vis.data.map(d => d.category)));

    const categoryColors = {
      'winter-storm-freeze': '#ccc',
      'drought-wildfire': '#ffffd9',
      'flooding': '#41b6c4',
      'tropical-cyclone': '#081d58',
      'severe-storm': '#c7e9b4'
    };

    vis.colorScale = d3.scaleOrdinal()
      .domain(disasterCategories)
      .range(disasterCategories.map(c => categoryColors[c]));
    
    vis.updateVis();
  }

  /**
   * Prepare the data and scales before we render it.
   */
  updateVis() {
    let vis = this;
    // x and y axes are static, do not need to update as data is filtered or changed
    // renderVis() will handle data grouping, marks, label, and tooltip
    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    // ---- grouping and marks handling ----
    const yearGroupsData = d3.groups(vis.data, d => d.year)
      .sort((a, b) => d3.ascending(+a[0], +b[0]));

    // one row for each year
    const yearGroups = vis.chart.selectAll('.year-group')
      .data(yearGroupsData, d => d[0]);

    yearGroups.exit().remove();

    // enter and update steps: set y position based on year
    const yearGroupsEnter = yearGroups.enter()
      .append('g')
      .attr('class', 'year-group');

    const yearGroupsMerged = yearGroupsEnter.merge(yearGroups)
      .attr('transform', d => `translate(0, ${vis.yScale(new Date(+d[0], 0, 1))})`);

    // 1 mark per disaster within the year group
    const marks = yearGroupsMerged.selectAll('.mark')
      .data(d => d[1], d => d.name);

    marks.exit().remove();

    // use path + arcGenerator for semicircles
    marks.enter()
      .append('path')
      .attr('class', 'mark')
      .merge(marks)
      .attr('transform', d => `translate(${vis.xScale(vis.xValue(d))}, 0)`) // x set based on day of year
      .attr('d', d => vis.arcGenerator(d))
      .attr('opacity', 0.6)
      .attr('stroke', '#333')
      .attr('stroke-width', 0.3)
      .attr('fill', d => vis.colorScale(d.category) ?? '#999');
    
    // ---- tooltip handling ----
    marks
      .on('mouseover', (event, d) => {
        d3.select('#tooltip')
          .style('display', 'block')
          .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
          .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
          .html(`
            <div class="tooltip-title">${d.name}</div>
            <div class="tooltip-cost">
              <p>$${d.cost} billion</p>
            </div>
            `);
      })
      .on('mousemove', (event) => {
        d3.select('#tooltip')
          .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
          .style('top', (event.pageY + vis.config.tooltipPadding) + 'px');
      })
      .on('mouseleave', () => {
        d3.select('#tooltip').style('display', 'none');
      });

    // ---- costliest per year label ----
    yearGroupsMerged.each(function(yearGroup) {
      const g = d3.select(this);
      const disastersThatYear = yearGroup[1];

      const maxCost = d3.max(disastersThatYear, d => d.cost);
      const costliestDisasters = disastersThatYear.filter(d => d.cost === maxCost);

      const labels = g.selectAll('text.costliest-label')
        .data(costliestDisasters, d => d.name);

      labels.exit().remove();

      labels.enter()
        .append('text')
        .attr('class', 'costliest-label')
        .merge(labels)
        .attr('x', d => vis.xScale(vis.xValue(d)))
        .attr('y', 1)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'hanging')
        .text(d => d.name);
    });

    // axes with axis lines removed
    vis.xAxisGroup.call(vis.xAxis)
      .call(g => g.select('.domain').remove());
    vis.yAxisGroup.call(vis.yAxis)
      .call(g => g.select('.domain').remove());
  }
}