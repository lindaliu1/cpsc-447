// Initialize helper function to convert date strings to date objects
const parseTime = d3.timeParse("%Y-%m-%d");

//Load data from CSV file asynchronously and render chart
d3.csv('data/disaster_costs.csv').then(data => {

  data.forEach(d => {
    d.cost = +d.cost;
    d.year = +d.year;
    d.date = parseTime(d.mid);
  });

  const timeline = new Timeline({
    parentElement: '#vis',
  }, data);

  // keep original data for filtering
  const allData = data;

  const selectedCategories = new Set();

  // helper fn to filter data and update vis
  const applyFilter = () => {
    const filtered = selectedCategories.size === 0
      ? allData
      : allData.filter(d => selectedCategories.has(d.category));

    timeline.data = filtered;
    timeline.updateVis();
  };

  // legend interaction
  d3.selectAll('.legend-button').on('click', function () {
    const category = d3.select(this).attr('data-category');

    if (selectedCategories.has(category)) {
      selectedCategories.delete(category);
      d3.select(this).classed('selected', false);
    } else {
      selectedCategories.add(category);
      d3.select(this).classed('selected', true);
    }

    applyFilter();
  });

  applyFilter();

}).catch(error => console.error(error));