
exports.categorizeVideos = async (allWatchedVideos)=>{
 
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Initialize objects to store categorized videos
    const categorizedVideos = {
        today: { shorts: [], videos: [] },
        yesterday: { shorts: [], videos: [] },
        others: { shorts: [], videos: [] }
    };

    // Iterate over each watched video
    allWatchedVideos.forEach(video => {
        console.log(video);
        // Determine the category based on uploadDate
        const uploadDate = new Date(video.uploadDate);
        let category;
        if (uploadDate.toDateString() === today.toDateString()) {
            category = "today";
        } else if (uploadDate.toDateString() === yesterday.toDateString()) {
            category = "yesterday";
        } else {
            category = "others";
        }

        // Determine the type of video
        if (video.type === "short") {
            categorizedVideos[category].shorts.push(video);
        } else {
            categorizedVideos[category].videos.push(video);
        }
    });
    return categorizedVideos;
}