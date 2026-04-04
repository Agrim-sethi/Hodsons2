// School Teams Data – player rosters, captains, coaches and recent results
// Each player has a name and the house they belong to.

export interface Player {
    name: string;
    house: 'Vindhya' | 'Himalaya' | 'Nilgiri' | 'Siwalik';
    role?: string; // e.g. 'Captain', 'Vice-Captain', 'Goalkeeper', etc.
}

export interface TeamResult {
    date: string;
    opponent: string;
    score: string;
    result: 'W' | 'L' | 'D';
    competition?: string;
}

export interface TeamData {
    captain: string;
    coach: string;
    players: Player[];
    recentResults: TeamResult[];
}

// Helper to generate a team key from sport + age group
export const teamKey = (sport: string, ageGroup: string) => `${sport}-${ageGroup}`;

// ─── Full team data ───────────────────────────────────────────────────
export const SCHOOL_TEAMS_DATA: Record<string, TeamData> = {

    // ══════════════════════════════════════
    //  FOOTBALL
    // ══════════════════════════════════════
    'Football-Under 13': {
        captain: 'Arjun Negi',
        coach: 'Mr. Vikram Singh',
        players: [
            { name: 'Arjun Negi', house: 'Nilgiri', role: 'Captain' },
            { name: 'Reyansh Thakur', house: 'Himalaya', role: 'Goalkeeper' },
            { name: 'Aditya Rawat', house: 'Vindhya' },
            { name: 'Sahil Mehta', house: 'Siwalik' },
            { name: 'Dev Chauhan', house: 'Nilgiri' },
            { name: 'Kabir Sharma', house: 'Himalaya' },
            { name: 'Vivaan Kapoor', house: 'Siwalik' },
            { name: 'Aarav Bisht', house: 'Vindhya' },
            { name: 'Ishaan Rana', house: 'Nilgiri' },
            { name: 'Yash Panwar', house: 'Himalaya' },
            { name: 'Ansh Dhiman', house: 'Siwalik' },
            { name: 'Rudra Pathania', house: 'Vindhya' },
            { name: 'Tanay Gupta', house: 'Nilgiri' },
            { name: 'Kian Verma', house: 'Himalaya' },
            { name: 'Lakshya Sood', house: 'Siwalik' },
            { name: 'Pranjal Thakur', house: 'Vindhya' },
        ],
        recentResults: [
            { date: '2026-02-15', opponent: 'Bishop Cotton School', score: '3-1', result: 'W', competition: 'IPSC U-13' },
            { date: '2026-01-28', opponent: 'Doon School', score: '1-2', result: 'L', competition: 'Friendly' },
            { date: '2025-11-12', opponent: 'Wynberg Allen School', score: '4-0', result: 'W', competition: 'IPSC U-13' },
        ],
    },

    'Football-Under 14': {
        captain: 'Rohan Pathak',
        coach: 'Mr. Vikram Singh',
        players: [
            { name: 'Rohan Pathak', house: 'Vindhya', role: 'Captain' },
            { name: 'Arnav Joshi', house: 'Nilgiri', role: 'Vice-Captain' },
            { name: 'Siddharth Rao', house: 'Himalaya', role: 'Goalkeeper' },
            { name: 'Dhruv Chand', house: 'Siwalik' },
            { name: 'Parth Sharma', house: 'Vindhya' },
            { name: 'Naman Verma', house: 'Nilgiri' },
            { name: 'Viraj Kapoor', house: 'Himalaya' },
            { name: 'Atharv Rawat', house: 'Siwalik' },
            { name: 'Shaurya Mehta', house: 'Vindhya' },
            { name: 'Krish Chauhan', house: 'Nilgiri' },
            { name: 'Jai Thakur', house: 'Himalaya' },
            { name: 'Manav Singh', house: 'Siwalik' },
            { name: 'Ritik Panwar', house: 'Vindhya' },
            { name: 'Pranav Sood', house: 'Nilgiri' },
            { name: 'Neil Bhatt', house: 'Himalaya' },
            { name: 'Swastik Kumar', house: 'Siwalik' },
            { name: 'Arin Dhiman', house: 'Vindhya' },
            { name: 'Darsh Negi', house: 'Nilgiri' },
        ],
        recentResults: [
            { date: '2026-03-01', opponent: 'Lawrence School Sanawar B', score: '2-0', result: 'W', competition: 'Practice' },
            { date: '2026-02-10', opponent: 'St. Edward\'s School', score: '1-1', result: 'D', competition: 'IPSC U-14' },
            { date: '2026-01-18', opponent: 'Pinegrove School', score: '5-2', result: 'W', competition: 'IPSC U-14' },
        ],
    },

    'Football-Under 17': {
        captain: 'Aayush Thakur',
        coach: 'Mr. Rajesh Kumar',
        players: [
            { name: 'Aayush Thakur', house: 'Himalaya', role: 'Captain' },
            { name: 'Harsh Vardhan', house: 'Vindhya', role: 'Vice-Captain' },
            { name: 'Raghav Mehra', house: 'Nilgiri', role: 'Goalkeeper' },
            { name: 'Yuvraj Chauhan', house: 'Siwalik' },
            { name: 'Daksh Sharma', house: 'Himalaya' },
            { name: 'Ankit Rawat', house: 'Vindhya' },
            { name: 'Kunal Suri', house: 'Nilgiri' },
            { name: 'Jayant Thakur', house: 'Siwalik' },
            { name: 'Mohit Rana', house: 'Himalaya' },
            { name: 'Tushar Panwar', house: 'Vindhya' },
            { name: 'Sarthak Negi', house: 'Nilgiri' },
            { name: 'Gaurav Dhiman', house: 'Siwalik' },
            { name: 'Sameer Kapoor', house: 'Himalaya' },
            { name: 'Chirag Bisht', house: 'Vindhya' },
            { name: 'Nikhil Verma', house: 'Nilgiri' },
            { name: 'Rahul Sood', house: 'Siwalik' },
            { name: 'Om Pathania', house: 'Himalaya' },
            { name: 'Lakshay Joshi', house: 'Vindhya' },
        ],
        recentResults: [
            { date: '2026-03-05', opponent: 'Doon School', score: '2-1', result: 'W', competition: 'IPSC U-17' },
            { date: '2026-02-20', opponent: 'Mayo College', score: '0-3', result: 'L', competition: 'IPSC U-17' },
            { date: '2026-02-08', opponent: 'Rashtriya Military School', score: '4-1', result: 'W', competition: 'Friendly' },
            { date: '2026-01-15', opponent: 'Welham Boys', score: '1-1', result: 'D', competition: 'IPSC U-17' },
        ],
    },

    'Football-Under 19': {
        captain: 'Vikrant Dogra',
        coach: 'Mr. Rajesh Kumar',
        players: [
            { name: 'Vikrant Dogra', house: 'Siwalik', role: 'Captain' },
            { name: 'Aman Thakur', house: 'Himalaya', role: 'Vice-Captain' },
            { name: 'Deepak Rawat', house: 'Vindhya', role: 'Goalkeeper' },
            { name: 'Sumit Chauhan', house: 'Nilgiri' },
            { name: 'Prateek Sharma', house: 'Siwalik' },
            { name: 'Abhinav Kapoor', house: 'Himalaya' },
            { name: 'Rishabh Verma', house: 'Vindhya' },
            { name: 'Kartik Negi', house: 'Nilgiri' },
            { name: 'Tarun Mehra', house: 'Siwalik' },
            { name: 'Sahil Rana', house: 'Himalaya' },
            { name: 'Ajay Panwar', house: 'Vindhya' },
            { name: 'Bhavesh Sood', house: 'Nilgiri' },
            { name: 'Mayank Dhiman', house: 'Siwalik' },
            { name: 'Ravi Pathania', house: 'Himalaya' },
            { name: 'Varun Bisht', house: 'Vindhya' },
            { name: 'Naveen Joshi', house: 'Nilgiri' },
            { name: 'Piyush Thakur', house: 'Siwalik' },
            { name: 'Lokesh Chauhan', house: 'Himalaya' },
            { name: 'Dinesh Rawat', house: 'Vindhya' },
            { name: 'Suresh Kumar', house: 'Nilgiri' },
        ],
        recentResults: [
            { date: '2026-03-10', opponent: 'Bishop Cotton School', score: '3-2', result: 'W', competition: 'IPSC Seniors' },
            { date: '2026-02-25', opponent: 'Doon School', score: '2-2', result: 'D', competition: 'IPSC Seniors' },
            { date: '2026-02-12', opponent: 'Col. Brown Cambridge School', score: '5-0', result: 'W', competition: 'Friendly' },
            { date: '2026-01-30', opponent: 'Welham Boys', score: '1-0', result: 'W', competition: 'IPSC Seniors' },
        ],
    },

    // ══════════════════════════════════════
    //  CRICKET
    // ══════════════════════════════════════
    'Cricket-Under 13': {
        captain: 'Advait Sharma',
        coach: 'Mr. Sunil Pathak',
        players: [
            { name: 'Advait Sharma', house: 'Himalaya', role: 'Captain' },
            { name: 'Rehan Verma', house: 'Nilgiri', role: 'Wicketkeeper' },
            { name: 'Suryansh Thakur', house: 'Vindhya' },
            { name: 'Kriday Rawat', house: 'Siwalik' },
            { name: 'Parv Mehta', house: 'Nilgiri' },
            { name: 'Tanish Kapoor', house: 'Himalaya' },
            { name: 'Aarush Chauhan', house: 'Vindhya' },
            { name: 'Viaan Sood', house: 'Siwalik' },
            { name: 'Dhairya Negi', house: 'Nilgiri' },
            { name: 'Divyansh Rana', house: 'Himalaya' },
            { name: 'Aahan Panwar', house: 'Vindhya' },
            { name: 'Kiaan Dhiman', house: 'Siwalik' },
            { name: 'Yuvaan Bisht', house: 'Nilgiri' },
        ],
        recentResults: [
            { date: '2026-02-20', opponent: 'Pinegrove School', score: 'Won by 45 runs', result: 'W', competition: 'IPSC U-13' },
            { date: '2026-01-25', opponent: 'St. Edward\'s School', score: 'Lost by 3 wkts', result: 'L', competition: 'IPSC U-13' },
        ],
    },

    'Cricket-Under 14': {
        captain: 'Kavish Thakur',
        coach: 'Mr. Sunil Pathak',
        players: [
            { name: 'Kavish Thakur', house: 'Vindhya', role: 'Captain' },
            { name: 'Arnav Rawat', house: 'Siwalik', role: 'Wicketkeeper' },
            { name: 'Hitesh Sharma', house: 'Nilgiri' },
            { name: 'Dev Kapoor', house: 'Himalaya' },
            { name: 'Manan Verma', house: 'Vindhya' },
            { name: 'Samarth Negi', house: 'Nilgiri' },
            { name: 'Yash Chauhan', house: 'Siwalik' },
            { name: 'Rian Mehra', house: 'Himalaya' },
            { name: 'Pranshu Rana', house: 'Vindhya' },
            { name: 'Shivansh Panwar', house: 'Nilgiri' },
            { name: 'Aariv Dhiman', house: 'Siwalik' },
            { name: 'Harshil Sood', house: 'Himalaya' },
            { name: 'Avyaan Bisht', house: 'Vindhya' },
            { name: 'Rudransh Pathania', house: 'Nilgiri' },
        ],
        recentResults: [
            { date: '2026-03-02', opponent: 'Bishop Cotton School', score: 'Won by 6 wkts', result: 'W', competition: 'IPSC U-14' },
            { date: '2026-02-14', opponent: 'Doon School', score: 'Lost by 28 runs', result: 'L', competition: 'IPSC U-14' },
            { date: '2026-01-20', opponent: 'Wynberg Allen School', score: 'Won by 8 wkts', result: 'W', competition: 'Friendly' },
        ],
    },

    'Cricket-Under 17': {
        captain: 'Raghav Sharma',
        coach: 'Mr. Deepak Chauhan',
        players: [
            { name: 'Raghav Sharma', house: 'Nilgiri', role: 'Captain' },
            { name: 'Ishant Thakur', house: 'Himalaya', role: 'Vice-Captain' },
            { name: 'Vansh Rawat', house: 'Vindhya', role: 'Wicketkeeper' },
            { name: 'Hardik Kapoor', house: 'Siwalik' },
            { name: 'Shivam Verma', house: 'Nilgiri' },
            { name: 'Aryan Negi', house: 'Himalaya' },
            { name: 'Ujjwal Chauhan', house: 'Vindhya' },
            { name: 'Devanshu Mehra', house: 'Siwalik' },
            { name: 'Akshat Rana', house: 'Nilgiri' },
            { name: 'Tanmay Panwar', house: 'Himalaya' },
            { name: 'Nishant Sood', house: 'Vindhya' },
            { name: 'Keshav Dhiman', house: 'Siwalik' },
            { name: 'Shreyas Bisht', house: 'Nilgiri' },
            { name: 'Avinash Pathania', house: 'Himalaya' },
            { name: 'Madhav Joshi', house: 'Vindhya' },
        ],
        recentResults: [
            { date: '2026-03-08', opponent: 'Rashtriya Military School', score: 'Won by 92 runs', result: 'W', competition: 'IPSC U-17' },
            { date: '2026-02-22', opponent: 'Mayo College', score: 'Lost by 5 wkts', result: 'L', competition: 'IPSC U-17' },
            { date: '2026-02-05', opponent: 'Welham Boys', score: 'Won by 4 wkts', result: 'W', competition: 'Friendly' },
            { date: '2026-01-22', opponent: 'Doon School', score: 'Tied', result: 'D', competition: 'IPSC U-17' },
        ],
    },

    'Cricket-Under 19': {
        captain: 'Vaibhav Dogra',
        coach: 'Mr. Deepak Chauhan',
        players: [
            { name: 'Vaibhav Dogra', house: 'Siwalik', role: 'Captain' },
            { name: 'Aakash Thakur', house: 'Vindhya', role: 'Vice-Captain' },
            { name: 'Pranav Rawat', house: 'Himalaya', role: 'Wicketkeeper' },
            { name: 'Saurabh Kapoor', house: 'Nilgiri' },
            { name: 'Manish Verma', house: 'Siwalik' },
            { name: 'Rohit Negi', house: 'Vindhya' },
            { name: 'Vishal Chauhan', house: 'Himalaya' },
            { name: 'Gaurav Mehra', house: 'Nilgiri' },
            { name: 'Deepanshu Rana', house: 'Siwalik' },
            { name: 'Harsh Panwar', house: 'Vindhya' },
            { name: 'Nitin Sood', house: 'Himalaya' },
            { name: 'Rajat Dhiman', house: 'Nilgiri' },
            { name: 'Ankur Bisht', house: 'Siwalik' },
            { name: 'Lalit Pathania', house: 'Vindhya' },
            { name: 'Mohit Joshi', house: 'Himalaya' },
            { name: 'Ramesh Kumar', house: 'Nilgiri' },
        ],
        recentResults: [
            { date: '2026-03-12', opponent: 'Bishop Cotton School', score: 'Won by 7 wkts', result: 'W', competition: 'IPSC Seniors' },
            { date: '2026-02-28', opponent: 'Col. Brown Cambridge School', score: 'Won by 110 runs', result: 'W', competition: 'IPSC Seniors' },
            { date: '2026-02-15', opponent: 'Doon School', score: 'Lost by 2 wkts', result: 'L', competition: 'IPSC Seniors' },
        ],
    },

    // ══════════════════════════════════════
    //  BASKETBALL
    // ══════════════════════════════════════
    'Basketball-Under 13': {
        captain: 'Aarav Joshi',
        coach: 'Mr. Pankaj Thakur',
        players: [
            { name: 'Aarav Joshi', house: 'Nilgiri', role: 'Captain' },
            { name: 'Shaurya Sharma', house: 'Vindhya' },
            { name: 'Vihaan Rawat', house: 'Himalaya' },
            { name: 'Atharva Chauhan', house: 'Siwalik' },
            { name: 'Reyansh Kapoor', house: 'Nilgiri' },
            { name: 'Kiyansh Verma', house: 'Vindhya' },
            { name: 'Darsh Negi', house: 'Himalaya' },
            { name: 'Praneel Mehra', house: 'Siwalik' },
            { name: 'Aarush Rana', house: 'Nilgiri' },
            { name: 'Dhruv Panwar', house: 'Vindhya' },
        ],
        recentResults: [
            { date: '2026-02-18', opponent: 'Pinegrove School', score: '42-28', result: 'W', competition: 'IPSC U-13' },
            { date: '2026-01-30', opponent: 'Doon School', score: '25-38', result: 'L', competition: 'IPSC U-13' },
        ],
    },

    'Basketball-Under 14': {
        captain: 'Ishan Kapoor',
        coach: 'Mr. Pankaj Thakur',
        players: [
            { name: 'Ishan Kapoor', house: 'Himalaya', role: 'Captain' },
            { name: 'Prithvi Sharma', house: 'Nilgiri' },
            { name: 'Amandeep Verma', house: 'Siwalik' },
            { name: 'Ronak Thakur', house: 'Vindhya' },
            { name: 'Arjit Rawat', house: 'Himalaya' },
            { name: 'Manav Chauhan', house: 'Nilgiri' },
            { name: 'Saksham Negi', house: 'Siwalik' },
            { name: 'Yuvaan Mehra', house: 'Vindhya' },
            { name: 'Prakhar Rana', house: 'Himalaya' },
            { name: 'Tanmay Sood', house: 'Nilgiri' },
            { name: 'Laksh Panwar', house: 'Siwalik' },
            { name: 'Rehan Dhiman', house: 'Vindhya' },
        ],
        recentResults: [
            { date: '2026-03-05', opponent: 'St. Edward\'s School', score: '55-40', result: 'W', competition: 'IPSC U-14' },
            { date: '2026-02-12', opponent: 'Bishop Cotton School', score: '38-45', result: 'L', competition: 'IPSC U-14' },
            { date: '2026-01-22', opponent: 'Wynberg Allen School', score: '52-30', result: 'W', competition: 'Friendly' },
        ],
    },

    'Basketball-Under 17': {
        captain: 'Samar Thakur',
        coach: 'Mr. Anand Verma',
        players: [
            { name: 'Samar Thakur', house: 'Siwalik', role: 'Captain' },
            { name: 'Yash Sharma', house: 'Vindhya', role: 'Vice-Captain' },
            { name: 'Aryan Kapoor', house: 'Himalaya' },
            { name: 'Siddharth Rawat', house: 'Nilgiri' },
            { name: 'Abhay Chauhan', house: 'Siwalik' },
            { name: 'Rishabh Negi', house: 'Vindhya' },
            { name: 'Kunal Mehra', house: 'Himalaya' },
            { name: 'Anmol Rana', house: 'Nilgiri' },
            { name: 'Pawan Panwar', house: 'Siwalik' },
            { name: 'Himanshu Sood', house: 'Vindhya' },
            { name: 'Varun Dhiman', house: 'Himalaya' },
            { name: 'Akash Bisht', house: 'Nilgiri' },
        ],
        recentResults: [
            { date: '2026-03-09', opponent: 'Doon School', score: '68-55', result: 'W', competition: 'IPSC U-17' },
            { date: '2026-02-22', opponent: 'Mayo College', score: '50-62', result: 'L', competition: 'IPSC U-17' },
            { date: '2026-02-05', opponent: 'Rashtriya Military School', score: '72-48', result: 'W', competition: 'Friendly' },
        ],
    },

    'Basketball-Under 19': {
        captain: 'Ranbir Singh',
        coach: 'Mr. Anand Verma',
        players: [
            { name: 'Ranbir Singh', house: 'Vindhya', role: 'Captain' },
            { name: 'Devendra Thakur', house: 'Himalaya', role: 'Vice-Captain' },
            { name: 'Manik Rawat', house: 'Siwalik' },
            { name: 'Jatin Sharma', house: 'Nilgiri' },
            { name: 'Sagar Kapoor', house: 'Vindhya' },
            { name: 'Arun Chauhan', house: 'Himalaya' },
            { name: 'Vipin Negi', house: 'Siwalik' },
            { name: 'Rakesh Mehra', house: 'Nilgiri' },
            { name: 'Chetan Rana', house: 'Vindhya' },
            { name: 'Dilip Panwar', house: 'Himalaya' },
            { name: 'Karan Sood', house: 'Siwalik' },
            { name: 'Sunil Dhiman', house: 'Nilgiri' },
        ],
        recentResults: [
            { date: '2026-03-11', opponent: 'Bishop Cotton School', score: '78-65', result: 'W', competition: 'IPSC Seniors' },
            { date: '2026-02-27', opponent: 'Welham Boys', score: '60-60', result: 'D', competition: 'IPSC Seniors' },
            { date: '2026-02-10', opponent: 'Doon School', score: '55-72', result: 'L', competition: 'IPSC Seniors' },
        ],
    },

    // ══════════════════════════════════════
    //  HOCKEY
    // ══════════════════════════════════════
    'Hockey-Under 13': {
        captain: 'Sahil Thakur',
        coach: 'Mr. Harish Negi',
        players: [
            { name: 'Sahil Thakur', house: 'Himalaya', role: 'Captain' },
            { name: 'Rohit Sharma', house: 'Nilgiri', role: 'Goalkeeper' },
            { name: 'Prem Rawat', house: 'Vindhya' },
            { name: 'Neeraj Chauhan', house: 'Siwalik' },
            { name: 'Aman Kapoor', house: 'Himalaya' },
            { name: 'Sonu Verma', house: 'Nilgiri' },
            { name: 'Bharat Negi', house: 'Vindhya' },
            { name: 'Rajan Mehra', house: 'Siwalik' },
            { name: 'Mohan Rana', house: 'Himalaya' },
            { name: 'Anil Panwar', house: 'Nilgiri' },
            { name: 'Govind Sood', house: 'Vindhya' },
        ],
        recentResults: [
            { date: '2026-02-10', opponent: 'Pinegrove School', score: '3-0', result: 'W', competition: 'IPSC U-13' },
            { date: '2026-01-20', opponent: 'Doon School', score: '1-4', result: 'L', competition: 'IPSC U-13' },
        ],
    },

    'Hockey-Under 14': {
        captain: 'Vikas Rawat',
        coach: 'Mr. Harish Negi',
        players: [
            { name: 'Vikas Rawat', house: 'Vindhya', role: 'Captain' },
            { name: 'Rajesh Thakur', house: 'Siwalik', role: 'Goalkeeper' },
            { name: 'Sandeep Sharma', house: 'Himalaya' },
            { name: 'Amit Kapoor', house: 'Nilgiri' },
            { name: 'Naresh Chauhan', house: 'Vindhya' },
            { name: 'Suresh Verma', house: 'Siwalik' },
            { name: 'Prakash Negi', house: 'Himalaya' },
            { name: 'Dinesh Mehra', house: 'Nilgiri' },
            { name: 'Ashok Rana', house: 'Vindhya' },
            { name: 'Ramesh Panwar', house: 'Siwalik' },
            { name: 'Manoj Sood', house: 'Himalaya' },
            { name: 'Laxman Dhiman', house: 'Nilgiri' },
        ],
        recentResults: [
            { date: '2026-03-03', opponent: 'Bishop Cotton School', score: '2-1', result: 'W', competition: 'IPSC U-14' },
            { date: '2026-02-16', opponent: 'St. Edward\'s School', score: '0-2', result: 'L', competition: 'IPSC U-14' },
            { date: '2026-01-28', opponent: 'Wynberg Allen School', score: '4-1', result: 'W', competition: 'Friendly' },
        ],
    },

    'Hockey-Under 17': {
        captain: 'Jitender Rawat',
        coach: 'Mr. Ravi Rana',
        players: [
            { name: 'Jitender Rawat', house: 'Siwalik', role: 'Captain' },
            { name: 'Kuldeep Sharma', house: 'Vindhya', role: 'Vice-Captain' },
            { name: 'Sachin Thakur', house: 'Himalaya', role: 'Goalkeeper' },
            { name: 'Ajay Kapoor', house: 'Nilgiri' },
            { name: 'Manoj Chauhan', house: 'Siwalik' },
            { name: 'Ravinder Verma', house: 'Vindhya' },
            { name: 'Baldev Negi', house: 'Himalaya' },
            { name: 'Girish Mehra', house: 'Nilgiri' },
            { name: 'Harpal Rana', house: 'Siwalik' },
            { name: 'Deep Panwar', house: 'Vindhya' },
            { name: 'Joginder Sood', house: 'Himalaya' },
            { name: 'Tej Dhiman', house: 'Nilgiri' },
            { name: 'Surinder Bisht', house: 'Siwalik' },
            { name: 'Om Pathania', house: 'Vindhya' },
        ],
        recentResults: [
            { date: '2026-03-07', opponent: 'Doon School', score: '3-2', result: 'W', competition: 'IPSC U-17' },
            { date: '2026-02-20', opponent: 'Rashtriya Military School', score: '1-1', result: 'D', competition: 'IPSC U-17' },
            { date: '2026-02-02', opponent: 'Mayo College', score: '0-2', result: 'L', competition: 'IPSC U-17' },
        ],
    },

    'Hockey-Under 19': {
        captain: 'Hardeep Singh',
        coach: 'Mr. Ravi Rana',
        players: [
            { name: 'Hardeep Singh', house: 'Himalaya', role: 'Captain' },
            { name: 'Jaswinder Thakur', house: 'Nilgiri', role: 'Vice-Captain' },
            { name: 'Baljeet Rawat', house: 'Vindhya', role: 'Goalkeeper' },
            { name: 'Gurmeet Sharma', house: 'Siwalik' },
            { name: 'Paramjeet Kapoor', house: 'Himalaya' },
            { name: 'Sukhdev Chauhan', house: 'Nilgiri' },
            { name: 'Amritpal Verma', house: 'Vindhya' },
            { name: 'Manpreet Negi', house: 'Siwalik' },
            { name: 'Harbhajan Mehra', house: 'Himalaya' },
            { name: 'Navjot Rana', house: 'Nilgiri' },
            { name: 'Gurpreet Panwar', house: 'Vindhya' },
            { name: 'Davinder Sood', house: 'Siwalik' },
            { name: 'Rajpal Dhiman', house: 'Himalaya' },
            { name: 'Kartar Bisht', house: 'Nilgiri' },
            { name: 'Satnam Pathania', house: 'Vindhya' },
            { name: 'Balraj Joshi', house: 'Siwalik' },
        ],
        recentResults: [
            { date: '2026-03-13', opponent: 'Bishop Cotton School', score: '4-1', result: 'W', competition: 'IPSC Seniors' },
            { date: '2026-02-26', opponent: 'Welham Boys', score: '2-3', result: 'L', competition: 'IPSC Seniors' },
            { date: '2026-02-08', opponent: 'Doon School', score: '3-0', result: 'W', competition: 'Friendly' },
        ],
    },

    // ══════════════════════════════════════
    //  ATHLETICS
    // ══════════════════════════════════════
    'Athletics-Under 13': {
        captain: 'Parth Sharma',
        coach: 'Mr. Mohan Lal',
        players: [
            { name: 'Parth Sharma', house: 'Vindhya', role: 'Captain' },
            { name: 'Hrithik Thakur', house: 'Nilgiri' },
            { name: 'Aaditya Rawat', house: 'Himalaya' },
            { name: 'Shubham Chauhan', house: 'Siwalik' },
            { name: 'Siddharth Kapoor', house: 'Vindhya' },
            { name: 'Kartik Verma', house: 'Nilgiri' },
            { name: 'Abhishek Negi', house: 'Himalaya' },
            { name: 'Priyanshu Mehra', house: 'Siwalik' },
        ],
        recentResults: [
            { date: '2026-02-28', opponent: 'Inter-House Athletics', score: '1st Place', result: 'W', competition: 'Inter-House' },
            { date: '2026-01-15', opponent: 'IPSC Athletics Meet', score: '3rd Place', result: 'L', competition: 'IPSC' },
        ],
    },

    'Athletics-Under 14': {
        captain: 'Vansh Thakur',
        coach: 'Mr. Mohan Lal',
        players: [
            { name: 'Vansh Thakur', house: 'Himalaya', role: 'Captain' },
            { name: 'Rishab Sharma', house: 'Vindhya' },
            { name: 'Karan Rawat', house: 'Nilgiri' },
            { name: 'Manik Chauhan', house: 'Siwalik' },
            { name: 'Pradeep Kapoor', house: 'Himalaya' },
            { name: 'Sohan Verma', house: 'Vindhya' },
            { name: 'Rahul Negi', house: 'Nilgiri' },
            { name: 'Vikash Mehra', house: 'Siwalik' },
            { name: 'Ashish Rana', house: 'Himalaya' },
            { name: 'Sumit Panwar', house: 'Vindhya' },
        ],
        recentResults: [
            { date: '2026-03-01', opponent: 'IPSC Athletics Meet', score: '2nd Place', result: 'W', competition: 'IPSC' },
            { date: '2026-02-10', opponent: 'Inter-House Athletics', score: '1st Place', result: 'W', competition: 'Inter-House' },
        ],
    },

    'Athletics-Under 17': {
        captain: 'Gaurav Thakur',
        coach: 'Mr. Bhupinder Singh',
        players: [
            { name: 'Gaurav Thakur', house: 'Siwalik', role: 'Captain' },
            { name: 'Dheeraj Sharma', house: 'Vindhya' },
            { name: 'Pawan Rawat', house: 'Nilgiri' },
            { name: 'Sunil Chauhan', house: 'Himalaya' },
            { name: 'Naveen Kapoor', house: 'Siwalik' },
            { name: 'Ramesh Verma', house: 'Vindhya' },
            { name: 'Lalit Negi', house: 'Nilgiri' },
            { name: 'Amar Mehra', house: 'Himalaya' },
            { name: 'Jatin Rana', house: 'Siwalik' },
            { name: 'Sachin Panwar', house: 'Vindhya' },
            { name: 'Deepak Sood', house: 'Nilgiri' },
            { name: 'Virender Dhiman', house: 'Himalaya' },
        ],
        recentResults: [
            { date: '2026-03-06', opponent: 'IPSC Athletics Meet', score: '1st Place', result: 'W', competition: 'IPSC' },
            { date: '2026-02-18', opponent: 'Inter-House Athletics', score: '1st Place', result: 'W', competition: 'Inter-House' },
            { date: '2026-01-25', opponent: 'District Athletics', score: '2nd Place', result: 'W', competition: 'District' },
        ],
    },

    'Athletics-Under 19': {
        captain: 'Manjeet Singh',
        coach: 'Mr. Bhupinder Singh',
        players: [
            { name: 'Manjeet Singh', house: 'Nilgiri', role: 'Captain' },
            { name: 'Harjeet Thakur', house: 'Vindhya' },
            { name: 'Balbir Rawat', house: 'Himalaya' },
            { name: 'Surjeet Chauhan', house: 'Siwalik' },
            { name: 'Inderjeet Kapoor', house: 'Nilgiri' },
            { name: 'Daljeet Verma', house: 'Vindhya' },
            { name: 'Kulbir Negi', house: 'Himalaya' },
            { name: 'Ranjeet Mehra', house: 'Siwalik' },
            { name: 'Jagjeet Rana', house: 'Nilgiri' },
            { name: 'Pritpal Panwar', house: 'Vindhya' },
            { name: 'Gurjeet Sood', house: 'Himalaya' },
            { name: 'Amarjeet Dhiman', house: 'Siwalik' },
        ],
        recentResults: [
            { date: '2026-03-10', opponent: 'IPSC Athletics Meet', score: '1st Place', result: 'W', competition: 'IPSC' },
            { date: '2026-02-25', opponent: 'State Athletics Meet', score: '3rd Place', result: 'L', competition: 'State' },
            { date: '2026-02-08', opponent: 'Inter-House Athletics', score: '1st Place', result: 'W', competition: 'Inter-House' },
        ],
    },
};
