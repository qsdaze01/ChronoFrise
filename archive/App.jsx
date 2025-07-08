// 📁 src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { Timeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const LOCAL_STORAGE_KEY = "timeline-events";

function App() {
  const timelineRef = useRef(null);
  const [items, setItems] = useState(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const timelineInstance = useRef(null);
  const pendingSelection = useRef(null);

  useEffect(() => {
    if (timelineRef.current && !timelineInstance.current) {
      const timeline = new Timeline(timelineRef.current, items, {
        width: "100%",
        height: "200px",
        stack: false,
        editable: false,
        margin: { item: 10 },
      });

      timeline.on("select", (props) => {
        const eventId = props.items[0];

        const event = timelineInstance.current?.itemsData?.get(eventId);
        setSelectedEvent(event || null);
        setIsEditing(false);
      });

      timelineInstance.current = timeline;
    }
  }, []);

  useEffect(() => {
    if (timelineInstance.current) {
      timelineInstance.current.setItems(items);
      timelineInstance.current.redraw();

      if (pendingSelection.current) {
        const idToSelect = pendingSelection.current;
        pendingSelection.current = null;

        setTimeout(() => {
          timelineInstance.current.setSelection(idToSelect);
          timelineInstance.current.focus(idToSelect);

          const event = items.find((e) => e.id === idToSelect);
          if (event) {
            setSelectedEvent(event);
          }
        }, 50);
      }
    }
  }, [items]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function handleAddEvent(e) {
    e.preventDefault();
    const form = e.target;
    const newEvent = {
      id: Date.now().toString(),
      content: form.title.value,
      start: form.start.value,
      end: form.end.value || null,
      title: form.title.value,
      description: form.description.value,
      image: form.image.value,
      location: {
        name: form.locationName.value,
        lat: parseFloat(form.lat.value),
        lng: parseFloat(form.lng.value),
      },
      linksTo: [],
    };

    pendingSelection.current = newEvent.id;
    setItems((prev) => [...prev, newEvent]);
    setSelectedEvent(newEvent);
    form.reset();
  }

  function handleExport() {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "timeline-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (Array.isArray(data)) {
          setItems(data);
        } else {
          alert("Le fichier n'est pas un tableau valide.");
        }
      } catch (err) {
        alert("Erreur lors de l'importation du fichier JSON.");
      }
    };
    reader.readAsText(file);
  }

  function handleDeleteEvent() {
    if (!selectedEvent) return;
    setItems(items.filter((item) => item.id !== selectedEvent.id));
    setSelectedEvent(null);
  }

  function handleEditSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const updatedEvent = {
      ...selectedEvent,
      content: form.title.value,
      start: form.start.value,
      end: form.end.value || null,
      title: form.title.value,
      description: form.description.value,
      image: form.image.value,
      location: {
        name: form.locationName.value,
        lat: parseFloat(form.lat.value),
        lng: parseFloat(form.lng.value),
      },
    };
    setItems(items.map((item) => (item.id === updatedEvent.id ? updatedEvent : item)));
    setSelectedEvent(updatedEvent);
    setIsEditing(false);
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Frise Chronologique Interactive</h1>
      <div className="flex gap-4">
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Exporter
        </button>
        <label className="cursor-pointer bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
          Importer
          <input
            type="file"
            accept="application/json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </div>

      <div ref={timelineRef}></div>

      {selectedEvent && (
        <div className="border p-4 rounded shadow bg-white">
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="space-y-2">
              <input name="title" defaultValue={selectedEvent.title} className="border p-2 w-full" required />
              <input name="start" type="date" defaultValue={selectedEvent.start} className="border p-2 w-full" required />
              <input name="end" type="date" defaultValue={selectedEvent.end || ""} className="border p-2 w-full" />
              <textarea name="description" defaultValue={selectedEvent.description} className="border p-2 w-full" />
              <input name="image" defaultValue={selectedEvent.image} className="border p-2 w-full" />
              <input name="locationName" defaultValue={selectedEvent.location?.name} className="border p-2 w-full" />
              <div className="grid grid-cols-2 gap-2">
                <input name="lat" defaultValue={selectedEvent.location?.lat} className="border p-2 w-full" />
                <input name="lng" defaultValue={selectedEvent.location?.lng} className="border p-2 w-full" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Enregistrer</button>
                <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-400 text-white px-4 py-2 rounded">Annuler</button>
              </div>
            </form>
          ) : (
            <>
              <h2 className="text-xl font-bold">{selectedEvent.title}</h2>
              <p className="text-gray-700">{selectedEvent.description}</p>
              {selectedEvent.start && selectedEvent.end && (
                <p className="text-sm text-gray-500"> Période : {selectedEvent.start.toString()}:{selectedEvent.end.toString()}</p>
              )}
              {selectedEvent.image && (
                <img
                  src={selectedEvent.image}
                  alt="illustration"
                  className="my-2 max-h-48 rounded"
                />
              )}
              {selectedEvent.location && (
                <MapContainer
                  center={[selectedEvent.location.lat, selectedEvent.location.lng]}
                  zoom={13}
                  scrollWheelZoom={false}
                  style={{ height: "300px", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  <Marker
                    position={[selectedEvent.location.lat, selectedEvent.location.lng]}
                  >
                    <Popup>{selectedEvent.location.name}</Popup>
                  </Marker>
                </MapContainer>
              )}
              <div className="mt-4 flex gap-2">
                <button onClick={() => setIsEditing(true)} className="bg-yellow-500 text-white px-4 py-2 rounded">Éditer</button>
                <button onClick={handleDeleteEvent} className="bg-red-600 text-white px-4 py-2 rounded">Supprimer</button>
              </div>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleAddEvent} className="space-y-4 bg-gray-50 p-4 rounded">
        <h2 className="text-lg font-semibold">Ajouter un événement</h2>
        <input name="title" placeholder="Titre" className="border p-2 w-full" required />
        <input name="start" type="date" placeholder="Date de début" className="border p-2 w-full" required />
        <input name="end" type="date" placeholder="Date de fin (optionnel)" className="border p-2 w-full" />
        <textarea
          name="description"
          placeholder="Description"
          className="border p-2 w-full"
        />
        <input
          name="image"
          placeholder="URL de l'image"
          className="border p-2 w-full"
        />
        <input
          name="locationName"
          placeholder="Nom du lieu"
          className="border p-2 w-full"
        />
        <div className="grid grid-cols-2 gap-2">
          <input name="lat" placeholder="Latitude" className="border p-2 w-full" defaultValue="0" />
          <input name="lng" placeholder="Longitude" className="border p-2 w-full" defaultValue="0" />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Ajouter
        </button>
      </form>
    </div>
  );
}

export default App;
