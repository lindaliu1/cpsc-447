/**
 * Load data from CSV file asynchronously and visualize it
 */
d3.csv('data/experiment_data.csv').then(data => {
    data.forEach(d => {
        d.accuracy = +d.accuracy;
    });

    // calculate mean accuracy for each trial
    let meanAccuracy = d3.rollups(
        data,
        v => d3.mean(v, d => d.accuracy),
        d => d.trial
    )

    // sort y axis into ascending order
    data.sort((a, b) => a.trial - b.trial);

    const scatterplot = new Scatterplot({ parentElement: '#vis'}, data, meanAccuracy);

    scatterplot.updateVis();
})
.catch(error => console.error(error));