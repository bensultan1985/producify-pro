# AI Composer Guide

## Overview

The AI Composer uses OpenAI's GPT-4 API to generate musical arrangements that complement your uploaded MIDI files. The system analyzes your music and creates new instrument tracks based on music theory principles and genre conventions.

## How It Works

### 1. Musical Analysis
When you upload a MIDI file, the system:
- Extracts tempo, key signature, and time signature
- Analyzes the note range and existing tracks
- Identifies the musical context

### 2. AI Composition
The AI acts as a music producer/composer:
- Follows common patterns and principles of your specified genre
- Makes decisions like a human composer
- Produces harmonies and rhythms that avoid dissonance
- Creates complementary arrangements

### 3. Section Processing
If you define sections (Intro, Verse, Chorus, etc.):
- Each section is processed individually
- Different instruments can be added to different sections
- Time-based section extraction ensures proper alignment

### 4. MIDI Generation
The AI response is converted to MIDI:
- New tracks are added to your original MIDI
- Timing is synchronized with the original material
- You can download the complete composition

## Configuration

### Required Environment Variables
```bash
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=your_postgres_connection_string
```

### API Model
The system uses `gpt-4-turbo-preview` for composition. This model provides:
- High-quality creative output
- Understanding of music theory
- JSON structured responses

## System Prompts

The AI is instructed to:
- Act as an AI music producer and composer
- Follow music theory and composition principles
- Create arrangements for the specified genre
- Make decisions to create pleasing, harmonious music
- Avoid dissonance and create balanced arrangements
- Apply standard production techniques

## Input Parameters

### Genre & Subgenre
- **Purpose**: Guides the AI's compositional style
- **Example**: Genre: "House", Subgenre: "Deep House"
- **Effect**: AI applies genre-specific patterns (rhythm, harmony, instrumentation)

### Instruments
Select from:
- Drums / Percussion
- Bass
- Piano
- Guitar
- Strings
- Brass
- Woodwinds
- Synth
- Pads
- Lead
- Vocal (MIDI)
- FX / Ear Candy
- Custom instruments (add your own)

### Sections
Define song sections with:
- **Name**: Intro, Verse, Chorus, Bridge, Outro, or Other (custom)
- **Time Range**: Start and end times (e.g., "0:15" to "0:45")
- **Instrument Selection**:
  - `all`: Use all selected instruments in this section
  - `none`: No instruments in this section
  - `manual`: Choose specific instruments for this section

## AI Response Format

The AI returns JSON with this structure:
```json
{
  "instruments": [
    {
      "name": "Bass",
      "notes": [
        {
          "midi": 36,
          "time": 0.0,
          "duration": 0.5,
          "velocity": 0.8
        }
      ]
    }
  ]
}
```

Where:
- `midi`: MIDI note number (0-127)
- `time`: Note start time in seconds
- `duration`: Note length in seconds
- `velocity`: Note intensity (0.0-1.0)

## Limitations & Considerations

### File Size
- Large MIDI files are summarized (first 100 notes per track)
- Complex arrangements may need section-based processing

### AI Tokens
- Each composition call uses OpenAI API tokens
- Longer sections or more complex pieces cost more

### Processing Time
- Typical composition: 10-30 seconds
- Complex multi-section pieces: 1-2 minutes
- Time depends on MIDI complexity and number of instruments

### Musical Quality
- AI follows theory but may occasionally create unusual patterns
- Review and edit the output as needed
- Works best with clear harmonic content in the original MIDI

## Best Practices

### 1. Start Simple
- Begin with 1-2 instruments
- Test with a short MIDI file
- Evaluate the results before scaling up

### 2. Provide Context
- Always specify genre if possible
- Use sections for structured songs
- Select instruments appropriate for the genre

### 3. Section Strategy
- Define clear section boundaries
- Use different instruments per section for variety
- Start times should align with musical phrases

### 4. Instrument Selection
- Choose complementary instruments
- Avoid overcrowding the arrangement
- Consider the role of each instrument

### 5. Iterative Approach
- Generate, listen, refine
- Try different instrument combinations
- Adjust sections based on results

## Troubleshooting

### "OPENAI_API_KEY environment variable is not set"
- Ensure `.env` file exists with valid API key
- Restart the server after adding the key

### Composition Fails
- Check OpenAI API quota and billing
- Verify MIDI file is valid (.mid or .midi)
- Reduce complexity (fewer instruments, shorter sections)

### Unexpected Musical Output
- Verify genre and subgenre are specified
- Check that section times are correct
- Ensure original MIDI has clear harmonic content

### Long Processing Times
- Large files take longer to process
- Multiple sections extend processing time
- Consider dividing into smaller compositions

## Examples

### Example 1: Simple Enhancement
- Upload: 4-bar piano melody
- Genre: "Jazz"
- Instruments: Bass, Drums
- Sections: None (process entire file)
- Result: Jazz bass line and drum pattern

### Example 2: Structured Song
- Upload: 2-minute chord progression
- Genre: "Pop"
- Sections:
  - Intro (0:00-0:15): Pads
  - Verse (0:15-0:45): Bass, Drums
  - Chorus (0:45-1:15): Bass, Drums, Strings
  - Outro (1:15-2:00): Pads
- Result: Complete pop arrangement

### Example 3: Electronic Production
- Upload: 8-bar synth pattern
- Genre: "House", Subgenre: "Deep House"
- Instruments: Drums, Bass, FX
- Result: Four-on-the-floor drums, sub bass, ear candy

## Technical Details

### MIDI Processing
- Uses `@tonejs/midi` library
- Preserves original tempo and time signatures
- Maintains note velocity and duration

### AI Integration
- Temperature: 0.7 (balanced creativity)
- Max tokens: 4000
- Response format: JSON

### File Storage
- Original: `./uploads/`
- Output: `./outputs/`
- Database: Postgres (job metadata)

## Future Enhancements

Potential improvements:
- Real-time preview during composition
- Fine-tune AI creativity (temperature control)
- Support for additional AI models
- Batch processing for albums
- User feedback loop to improve results
- Custom music theory rules

## Support

For issues or questions:
1. Check this guide first
2. Review the README.md
3. Check OpenAI API status
4. Verify environment configuration
5. Review server logs for detailed errors
