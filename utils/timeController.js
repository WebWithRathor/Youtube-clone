exports.timeDiffer =(date)=> {
    const now = new Date();
    const diff = now - date;
  
    // Convert milliseconds to seconds
    const seconds = Math.floor(diff / 1000);
  
    if (seconds < 60) {
      return `${seconds}sec`;
    }
  
    const minutes = Math.floor(seconds / 60);
  
    if (minutes < 60) {
      return `${minutes}min`;
    }
  
    const hours = Math.floor(minutes / 60);
  
    if (hours < 24) {
      return `${hours}hr`;
    }
  
    const days = Math.floor(hours / 24);
  
    if (days < 7) {
      return `${days} day`;
    }
  
    const weeks = Math.floor(days / 7);

    if(weeks < 3){
        return `${weeks} week`;
    }

    return date.toDateString();
  
  }