const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Start of today in IST (00:00 IST), as a UTC Date for the Mongo query
const getStartOfTodayIST = () => {
    const istNow = new Date(Date.now() + IST_OFFSET_MS);
    return new Date(
        Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()) - IST_OFFSET_MS
    );
};

const timeAgo = (date) => {
    const diffSec = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));

    if (diffSec < 60) return `${diffSec} sec ago`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;

    const diffHr = Math.floor(diffMin / 60);
    const remMin = diffMin % 60;
    return remMin ? `${diffHr} hr ${remMin} min ago` : `${diffHr} hr ago`;
};

module.exports = {
    getStartOfTodayIST,
    timeAgo
};